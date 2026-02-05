-- ============================================================
-- Server-side order creation with total verification
-- ============================================================

CREATE OR REPLACE FUNCTION price_for_line_php(
  p_ingredient_id UUID,
  p_unit TEXT,
  p_amount NUMERIC
) RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  unit_norm TEXT := LOWER(COALESCE(p_unit, ''));
  amount_val NUMERIC := COALESCE(p_amount, 0);
  per_unit_price NUMERIC;
  per_gram_price NUMERIC;
  per_ml_price NUMERIC;
  flat_price NUMERIC;
BEGIN
  SELECT price_php INTO per_unit_price
  FROM ingredient_pricing_effective
  WHERE ingredient_id = p_ingredient_id
    AND pricing_mode = 'per_unit'
    AND LOWER(COALESCE(unit_label, '')) = unit_norm
  LIMIT 1;

  IF per_unit_price IS NOT NULL THEN
    RETURN per_unit_price * amount_val;
  END IF;

  SELECT per_php INTO per_gram_price
  FROM ingredient_pricing_effective
  WHERE ingredient_id = p_ingredient_id
    AND pricing_mode = 'per_gram'
  LIMIT 1;

  IF unit_norm = 'g' AND per_gram_price IS NOT NULL THEN
    RETURN per_gram_price * amount_val;
  END IF;

  SELECT per_php INTO per_ml_price
  FROM ingredient_pricing_effective
  WHERE ingredient_id = p_ingredient_id
    AND pricing_mode = 'per_ml'
  LIMIT 1;

  IF unit_norm = 'ml' AND per_ml_price IS NOT NULL THEN
    RETURN per_ml_price * amount_val;
  END IF;

  SELECT price_php INTO flat_price
  FROM ingredient_pricing_effective
  WHERE ingredient_id = p_ingredient_id
    AND pricing_mode = 'flat'
  LIMIT 1;

  RETURN COALESCE(flat_price, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION price_for_line_php(UUID, TEXT, NUMERIC) TO anon, authenticated;

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
  tracking_code TEXT;
  cart_json JSONB := COALESCE(p_cart_items, '[]'::jsonb);
  subtotal_cents INTEGER := 0;
  promo_result JSONB;
  discount_cents INTEGER := 0;
  new_subtotal_cents INTEGER := 0;
  item JSONB;
  item_idx INTEGER := 0;
  item_name TEXT;
  drink_id UUID;
  size_ml INTEGER;
  base_price_php NUMERIC;
  addon_total_php NUMERIC;
  unit_price_cents INTEGER;
  item_id UUID;
  line JSONB;
  line_is_extra BOOLEAN;
BEGIN
  IF jsonb_array_length(cart_json) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'errors', jsonb_build_array('Cart is empty')
    );
  END IF;

  -- compute subtotal
  FOR item IN SELECT * FROM jsonb_array_elements(cart_json)
  LOOP
    drink_id := (item->>'drink_id')::UUID;
    size_ml := NULLIF(item->>'size_ml', '')::INT;
    item_name := item->>'item_name';

    SELECT price_php INTO base_price_php
    FROM drink_sizes
    WHERE drink_id = drink_id AND size_ml = size_ml AND is_active = true
    LIMIT 1;

    IF base_price_php IS NULL THEN
      SELECT price_php INTO base_price_php
      FROM drinks
      WHERE id = drink_id AND is_active = true
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
    NULLIF(TRIM(p_guest_name), ''),
    NULLIF(TRIM(p_guest_phone), ''),
    'pending',
    p_payment_method,
    p_payment_status,
    NULLIF(TRIM(p_payment_reference), ''),
    p_payment_proof_url,
    subtotal_cents,
    COALESCE((promo_result->'applied_promo'->>'promo_id')::UUID, NULL),
    COALESCE(p_promo_code, NULL),
    discount_cents
  )
  RETURNING id, tracking_code INTO order_id, tracking_code;

  -- insert items and lines
  item_idx := 0;
  FOR item IN SELECT * FROM jsonb_array_elements(cart_json)
  LOOP
    drink_id := (item->>'drink_id')::UUID;
    size_ml := NULLIF(item->>'size_ml', '')::INT;
    item_name := item->>'item_name';

    SELECT price_php INTO base_price_php
    FROM drink_sizes
    WHERE drink_id = drink_id AND size_ml = size_ml AND is_active = true
    LIMIT 1;

    IF base_price_php IS NULL THEN
      SELECT price_php INTO base_price_php
      FROM drinks
      WHERE id = drink_id AND is_active = true
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
      drink_id,
      COALESCE(item_name, 'Item'),
      size_ml,
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
    'tracking_code', tracking_code,
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
