-- ============================================================
-- Data integrity + server-side validation hardening
-- ============================================================

-- Basic constraints (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_payment_method_chk'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_payment_method_chk
      CHECK (payment_method IN ('cash', 'gcash', 'bank'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_payment_status_chk'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_payment_status_chk
      CHECK (payment_status IN ('unpaid', 'pending_verification', 'paid'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'order_items_price_chk'
  ) THEN
    ALTER TABLE order_items
      ADD CONSTRAINT order_items_price_chk
      CHECK (unit_price_cents >= 0 AND line_total_cents >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'order_items_size_ml_chk'
  ) THEN
    ALTER TABLE order_items
      ADD CONSTRAINT order_items_size_ml_chk
      CHECK (size_ml IS NULL OR size_ml > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'order_item_ingredients_amount_chk'
  ) THEN
    ALTER TABLE order_item_ingredients
      ADD CONSTRAINT order_item_ingredients_amount_chk
      CHECK (amount > 0 AND COALESCE(TRIM(unit), '') <> '');
  END IF;
END $$;

-- Replace create_order_with_items with stricter validation
CREATE OR REPLACE FUNCTION create_order_with_items(
  p_pickup_time TIMESTAMPTZ,
  p_guest_name TEXT,
  p_guest_phone TEXT,
  p_payment_method TEXT,
  p_payment_status TEXT,
  p_payment_reference TEXT,
  p_payment_proof_url TEXT,
  p_cart_items JSONB,
  p_promo_code TEXT DEFAULT NULL,
  p_selected_variant_id UUID DEFAULT NULL,
  p_selected_addon_id UUID DEFAULT NULL,
  p_customer_identifier TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_id UUID;
  v_tracking_code TEXT;
  cart_json JSONB := COALESCE(p_cart_items, '[]'::jsonb);
  subtotal_cents INTEGER := 0;
  promo_result JSONB;
  discount_cents INTEGER := 0;
  new_subtotal_cents INTEGER := 0;
  item JSONB;
  item_idx INTEGER := 0;
  item_name TEXT;
  v_drink_id UUID;
  v_size_ml INTEGER;
  base_price_php NUMERIC;
  addon_total_php NUMERIC;
  unit_price_cents INTEGER;
  item_id UUID;
  line JSONB;
  line_is_extra BOOLEAN;
  trimmed_name TEXT;
  trimmed_phone TEXT;
  phone_digits TEXT;
BEGIN
  -- Basic input validation
  IF p_pickup_time IS NULL OR p_pickup_time < now() + interval '5 minutes' THEN
    RETURN jsonb_build_object(
      'success', false,
      'errors', jsonb_build_array('Pickup time must be at least 5 minutes from now')
    );
  END IF;

  trimmed_name := NULLIF(BTRIM(p_guest_name), '');
  trimmed_phone := NULLIF(BTRIM(p_guest_phone), '');
  phone_digits := regexp_replace(COALESCE(trimmed_phone, ''), '\D', '', 'g');

  IF trimmed_name IS NULL OR length(trimmed_name) < 2 THEN
    RETURN jsonb_build_object(
      'success', false,
      'errors', jsonb_build_array('Please enter your full name')
    );
  END IF;

  IF trimmed_phone IS NULL OR length(phone_digits) < 10 OR length(phone_digits) > 13 THEN
    RETURN jsonb_build_object(
      'success', false,
      'errors', jsonb_build_array('Enter a valid phone number (10-13 digits)')
    );
  END IF;

  IF p_payment_method NOT IN ('cash', 'gcash', 'bank') THEN
    RETURN jsonb_build_object(
      'success', false,
      'errors', jsonb_build_array('Invalid payment method')
    );
  END IF;

  IF p_payment_status NOT IN ('unpaid', 'pending_verification', 'paid') THEN
    RETURN jsonb_build_object(
      'success', false,
      'errors', jsonb_build_array('Invalid payment status')
    );
  END IF;

  IF p_payment_method IN ('gcash', 'bank') THEN
    IF NULLIF(BTRIM(p_payment_reference), '') IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'errors', jsonb_build_array('Payment reference is required')
      );
    END IF;
    IF NULLIF(BTRIM(p_payment_proof_url), '') IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'errors', jsonb_build_array('Payment proof is required')
      );
    END IF;
  END IF;

  IF jsonb_array_length(cart_json) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'errors', jsonb_build_array('Cart is empty')
    );
  END IF;

  -- compute subtotal
  FOR item IN SELECT * FROM jsonb_array_elements(cart_json)
  LOOP
    v_drink_id := (item->>'drink_id')::UUID;
    v_size_ml := NULLIF(item->>'size_ml', '')::INT;
    item_name := item->>'item_name';

    IF v_drink_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'errors', jsonb_build_array('Missing drink id')
      );
    END IF;

    SELECT price_php INTO base_price_php
    FROM drink_sizes
    WHERE drink_sizes.drink_id = v_drink_id
      AND drink_sizes.size_ml = v_size_ml
      AND drink_sizes.is_active = true
    LIMIT 1;

    IF base_price_php IS NULL THEN
      SELECT price_php INTO base_price_php
      FROM drinks
      WHERE drinks.id = v_drink_id
        AND drinks.is_active = true
      LIMIT 1;
    END IF;

    IF base_price_php IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'errors', jsonb_build_array('Missing price for drink')
      );
    END IF;

    addon_total_php := 0;
    IF item ? 'lines' THEN
      FOR line IN SELECT * FROM jsonb_array_elements(item->'lines')
      LOOP
        IF NULLIF(BTRIM(line->>'ingredient_id'), '') IS NULL THEN
          RETURN jsonb_build_object(
            'success', false,
            'errors', jsonb_build_array('Missing ingredient id')
          );
        END IF;

        IF COALESCE((line->>'amount')::NUMERIC, 0) <= 0 OR NULLIF(BTRIM(line->>'unit'), '') IS NULL THEN
          RETURN jsonb_build_object(
            'success', false,
            'errors', jsonb_build_array('Invalid ingredient amount/unit')
          );
        END IF;

        PERFORM 1 FROM ingredients WHERE id = (line->>'ingredient_id')::UUID AND is_active = true;
        IF NOT FOUND THEN
          RETURN jsonb_build_object(
            'success', false,
            'errors', jsonb_build_array('Ingredient not available')
          );
        END IF;

        line_is_extra := COALESCE((line->>'is_extra')::BOOLEAN, FALSE);
        IF line_is_extra THEN
          addon_total_php := addon_total_php + price_for_line_php(
            (line->>'ingredient_id')::UUID,
            line->>'unit',
            (line->>'amount')::NUMERIC
          );
        END IF;
      END LOOP;
    END IF;

    unit_price_cents := ROUND((base_price_php + addon_total_php) * 100);
    subtotal_cents := subtotal_cents + unit_price_cents;
  END LOOP;

  discount_cents := 0;
  new_subtotal_cents := subtotal_cents;

  IF p_promo_code IS NOT NULL AND BTRIM(p_promo_code) <> '' THEN
    promo_result := validate_apply_promo(
      p_promo_code,
      subtotal_cents,
      cart_json,
      p_selected_variant_id,
      p_selected_addon_id,
      p_customer_identifier
    );

    IF COALESCE((promo_result->>'success')::BOOLEAN, FALSE) = TRUE THEN
      discount_cents := COALESCE((promo_result->>'discount_cents')::INTEGER, 0);
      new_subtotal_cents := COALESCE((promo_result->>'new_subtotal_cents')::INTEGER, subtotal_cents);
    ELSE
      RETURN jsonb_build_object(
        'success', false,
        'errors', COALESCE(promo_result->'errors', jsonb_build_array('Promo validation failed'))
      );
    END IF;
  END IF;

  INSERT INTO orders (
    pickup_time,
    guest_name,
    guest_phone,
    status,
    payment_method,
    payment_status,
    payment_reference,
    payment_proof_url,
    subtotal_cents,
    promo_id,
    promo_code_applied,
    promo_discount_cents
  ) VALUES (
    p_pickup_time,
    trimmed_name,
    trimmed_phone,
    'pending',
    p_payment_method,
    p_payment_status,
    NULLIF(TRIM(p_payment_reference), ''),
    NULLIF(TRIM(p_payment_proof_url), ''),
    subtotal_cents,
    COALESCE((promo_result->'applied_promo'->>'promo_id')::UUID, NULL),
    COALESCE(p_promo_code, NULL),
    discount_cents
  )
  RETURNING id, tracking_code INTO order_id, v_tracking_code;

  -- insert items and lines
  item_idx := 0;
  FOR item IN SELECT * FROM jsonb_array_elements(cart_json)
  LOOP
    v_drink_id := (item->>'drink_id')::UUID;
    v_size_ml := NULLIF(item->>'size_ml', '')::INT;
    item_name := item->>'item_name';

    SELECT price_php INTO base_price_php
    FROM drink_sizes
    WHERE drink_sizes.drink_id = v_drink_id
      AND drink_sizes.size_ml = v_size_ml
      AND drink_sizes.is_active = true
    LIMIT 1;

    IF base_price_php IS NULL THEN
      SELECT price_php INTO base_price_php
      FROM drinks
      WHERE drinks.id = v_drink_id
        AND drinks.is_active = true
      LIMIT 1;
    END IF;

    addon_total_php := 0;
    IF item ? 'lines' THEN
      FOR line IN SELECT * FROM jsonb_array_elements(item->'lines')
      LOOP
        line_is_extra := COALESCE((line->>'is_extra')::BOOLEAN, FALSE);
        IF line_is_extra THEN
          addon_total_php := addon_total_php + price_for_line_php(
            (line->>'ingredient_id')::UUID,
            line->>'unit',
            (line->>'amount')::NUMERIC
          );
        END IF;
      END LOOP;
    END IF;

    unit_price_cents := ROUND((base_price_php + addon_total_php) * 100);

    INSERT INTO order_items (
      order_id,
      drink_id,
      item_name,
      size_ml,
      unit_price_cents,
      line_total_cents,
      position
    ) VALUES (
      order_id,
      v_drink_id,
      COALESCE(item_name, 'Item'),
      v_size_ml,
      unit_price_cents,
      unit_price_cents,
      item_idx
    )
    RETURNING id INTO item_id;

    IF item ? 'lines' THEN
      FOR line IN SELECT * FROM jsonb_array_elements(item->'lines')
      LOOP
        INSERT INTO order_item_ingredients (
          order_item_id,
          ingredient_id,
          amount,
          unit,
          is_extra
        ) VALUES (
          item_id,
          (line->>'ingredient_id')::UUID,
          (line->>'amount')::NUMERIC,
          line->>'unit',
          COALESCE((line->>'is_extra')::BOOLEAN, FALSE)
        );
      END LOOP;
    END IF;

    item_idx := item_idx + 1;
  END LOOP;

  IF discount_cents > 0 AND (promo_result->'applied_promo'->>'promo_id') IS NOT NULL THEN
    INSERT INTO promo_usage (promo_id, order_id, customer_identifier, discount_cents)
    VALUES (
      (promo_result->'applied_promo'->>'promo_id')::UUID,
      order_id,
      p_customer_identifier,
      discount_cents
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', order_id,
    'tracking_code', v_tracking_code,
    'subtotal_cents', subtotal_cents,
    'promo_discount_cents', discount_cents,
    'total_cents', new_subtotal_cents
  );
END;
$$;

GRANT EXECUTE ON FUNCTION create_order_with_items(
  TIMESTAMPTZ,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  JSONB,
  TEXT,
  UUID,
  UUID,
  TEXT
) TO anon, authenticated;
