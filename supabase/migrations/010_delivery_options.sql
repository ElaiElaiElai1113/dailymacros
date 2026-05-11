-- ============================================================
-- Order delivery options
-- ============================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_option TEXT NOT NULL DEFAULT 'pickup',
  ADD COLUMN IF NOT EXISTS delivery_address TEXT,
  ADD COLUMN IF NOT EXISTS delivery_fee_cents INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_delivery_option_chk'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_delivery_option_chk
      CHECK (delivery_option IN ('pickup', 'free_delivery', 'paid_delivery_car', 'maxim_delivery'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_delivery_fee_cents_chk'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_delivery_fee_cents_chk
      CHECK (delivery_fee_cents >= 0);
  END IF;
END $$;

DROP FUNCTION IF EXISTS create_order_with_items(
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
);

CREATE OR REPLACE FUNCTION create_order_with_items(
  p_pickup_time TIMESTAMPTZ,
  p_guest_name TEXT,
  p_guest_phone TEXT,
  p_payment_method TEXT,
  p_payment_status TEXT,
  p_payment_reference TEXT,
  p_payment_proof_url TEXT,
  p_delivery_option TEXT,
  p_delivery_address TEXT,
  p_delivery_fee_cents INTEGER,
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
  v_delivery_option TEXT;
  trimmed_delivery_address TEXT;
  expected_delivery_fee_cents INTEGER;
BEGIN
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

  v_delivery_option := COALESCE(NULLIF(BTRIM(p_delivery_option), ''), 'pickup');
  trimmed_delivery_address := NULLIF(BTRIM(p_delivery_address), '');

  IF v_delivery_option NOT IN ('pickup', 'free_delivery', 'paid_delivery_car', 'maxim_delivery') THEN
    RETURN jsonb_build_object(
      'success', false,
      'errors', jsonb_build_array('Invalid delivery option')
    );
  END IF;

  expected_delivery_fee_cents := CASE v_delivery_option
    WHEN 'paid_delivery_car' THEN 10000
    ELSE 0
  END;

  IF COALESCE(p_delivery_fee_cents, expected_delivery_fee_cents) <> expected_delivery_fee_cents THEN
    RETURN jsonb_build_object(
      'success', false,
      'errors', jsonb_build_array('Invalid delivery fee')
    );
  END IF;

  IF v_delivery_option <> 'pickup'
    AND (trimmed_delivery_address IS NULL OR length(trimmed_delivery_address) < 8) THEN
    RETURN jsonb_build_object(
      'success', false,
      'errors', jsonb_build_array('Please enter a complete delivery address')
    );
  END IF;

  IF jsonb_array_length(cart_json) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'errors', jsonb_build_array('Cart is empty')
    );
  END IF;

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
    delivery_option,
    delivery_address,
    delivery_fee_cents,
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
    v_delivery_option,
    CASE WHEN v_delivery_option = 'pickup' THEN NULL ELSE trimmed_delivery_address END,
    expected_delivery_fee_cents,
    subtotal_cents,
    COALESCE((promo_result->'applied_promo'->>'promo_id')::UUID, NULL),
    COALESCE(p_promo_code, NULL),
    discount_cents
  )
  RETURNING id, tracking_code INTO order_id, v_tracking_code;

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
    'delivery_fee_cents', expected_delivery_fee_cents,
    'total_cents', new_subtotal_cents + expected_delivery_fee_cents
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
  TEXT,
  TEXT,
  INTEGER,
  JSONB,
  TEXT,
  UUID,
  UUID,
  TEXT
) TO anon, authenticated;

CREATE OR REPLACE FUNCTION get_order_tracking(
  p_tracking_code TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o RECORD;
  items JSONB;
  lines JSONB;
  macros JSONB;
BEGIN
  SELECT
    id,
    created_at,
    pickup_time,
    status,
    guest_name,
    guest_phone,
    tracking_code,
    promo_code_applied,
    promo_discount_cents,
    delivery_option,
    delivery_address,
    delivery_fee_cents
  INTO o
  FROM orders
  WHERE tracking_code = p_tracking_code
  LIMIT 1;

  IF o.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(oi)), '[]'::jsonb)
  INTO items
  FROM (
    SELECT id, order_id, item_name, unit_price_cents, line_total_cents
    FROM order_items
    WHERE order_id = o.id
    ORDER BY position ASC
  ) oi;

  SELECT COALESCE(jsonb_agg(row_to_json(lx)), '[]'::jsonb)
  INTO lines
  FROM (
    SELECT
      oi.id as order_item_id,
      oii.ingredient_id,
      oii.amount,
      oii.unit,
      oii.is_extra,
      ing.name as ingredient_name
    FROM order_items oi
    JOIN order_item_ingredients oii ON oii.order_item_id = oi.id
    LEFT JOIN ingredients ing ON ing.id = oii.ingredient_id
    WHERE oi.order_id = o.id
  ) lx;

  SELECT COALESCE(jsonb_agg(row_to_json(mx)), '[]'::jsonb)
  INTO macros
  FROM (
    SELECT
      m.order_item_id,
      m.total_kcal,
      m.total_protein_g,
      m.total_fat_g,
      m.total_carbs_g,
      m.total_sugars_g,
      m.total_fiber_g,
      m.total_sodium_mg
    FROM order_item_macros_v m
    JOIN order_items oi ON oi.id = m.order_item_id
    WHERE oi.order_id = o.id
  ) mx;

  RETURN jsonb_build_object(
    'success', true,
    'order', row_to_json(o),
    'items', items,
    'lines', lines,
    'macros', macros
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_order_tracking(TEXT) TO anon, authenticated;
