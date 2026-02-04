-- ============================================================
-- Promo validation + application RPC (server-side)
-- ============================================================

CREATE OR REPLACE FUNCTION validate_apply_promo(
  p_code TEXT,
  p_subtotal_cents INTEGER,
  p_cart_items JSONB,
  p_selected_variant_id UUID DEFAULT NULL,
  p_selected_addon_id UUID DEFAULT NULL,
  p_customer_identifier TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  promo_row promos%ROWTYPE;
  bundle_row promo_bundles%ROWTYPE;
  free_addon_row promo_free_addons%ROWTYPE;
  discount_cents INTEGER := 0;
  new_subtotal_cents INTEGER := 0;
  total_items INTEGER := 0;
  count_12oz INTEGER := 0;
  count_16oz INTEGER := 0;
  now_ts TIMESTAMPTZ := NOW();
  cart_json JSONB := COALESCE(p_cart_items, '[]'::jsonb);
  variant_price_cents INTEGER := NULL;
  addon_price_php NUMERIC := NULL;
  max_free_qty INTEGER := NULL;
  has_applicable_item BOOLEAN := TRUE;
BEGIN
  IF p_code IS NULL OR BTRIM(p_code) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'discount_cents', 0,
      'new_subtotal_cents', COALESCE(p_subtotal_cents, 0),
      'errors', jsonb_build_array('Please enter a promo code')
    );
  END IF;

  SELECT * INTO promo_row
  FROM promos
  WHERE code = UPPER(TRIM(p_code))
    AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'discount_cents', 0,
      'new_subtotal_cents', COALESCE(p_subtotal_cents, 0),
      'errors', jsonb_build_array('Invalid promo code')
    );
  END IF;

  IF promo_row.valid_from > now_ts THEN
    RETURN jsonb_build_object(
      'success', false,
      'discount_cents', 0,
      'new_subtotal_cents', COALESCE(p_subtotal_cents, 0),
      'promo', to_jsonb(promo_row),
      'errors', jsonb_build_array('This promo is not yet active')
    );
  END IF;

  IF promo_row.valid_until IS NOT NULL AND promo_row.valid_until < now_ts THEN
    RETURN jsonb_build_object(
      'success', false,
      'discount_cents', 0,
      'new_subtotal_cents', COALESCE(p_subtotal_cents, 0),
      'promo', to_jsonb(promo_row),
      'errors', jsonb_build_array('This promo has expired')
    );
  END IF;

  IF promo_row.usage_limit_total IS NOT NULL THEN
    PERFORM 1
    FROM promo_usage
    WHERE promo_id = promo_row.id
    HAVING COUNT(*) >= promo_row.usage_limit_total;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'discount_cents', 0,
        'new_subtotal_cents', COALESCE(p_subtotal_cents, 0),
        'promo', to_jsonb(promo_row),
        'errors', jsonb_build_array('This promo has reached its usage limit')
      );
    END IF;
  END IF;

  IF promo_row.usage_limit_per_customer IS NOT NULL AND p_customer_identifier IS NOT NULL THEN
    PERFORM 1
    FROM promo_usage
    WHERE promo_id = promo_row.id
      AND customer_identifier = p_customer_identifier
    HAVING COUNT(*) >= promo_row.usage_limit_per_customer;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'discount_cents', 0,
        'new_subtotal_cents', COALESCE(p_subtotal_cents, 0),
        'promo', to_jsonb(promo_row),
        'errors', jsonb_build_array('You have reached the usage limit for this promo')
      );
    END IF;
  END IF;

  SELECT COUNT(*) INTO total_items
  FROM jsonb_array_elements(cart_json);

  SELECT COUNT(*) INTO count_12oz
  FROM jsonb_array_elements(cart_json) AS item
  WHERE (item->>'size_ml')::INT = 355;

  SELECT COUNT(*) INTO count_16oz
  FROM jsonb_array_elements(cart_json) AS item
  WHERE (item->>'size_ml')::INT = 473;

  IF promo_row.applicable_drink_ids IS NOT NULL AND array_length(promo_row.applicable_drink_ids, 1) > 0 THEN
    SELECT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(cart_json) AS item
      WHERE (item->>'drink_id')::UUID = ANY (promo_row.applicable_drink_ids)
    ) INTO has_applicable_item;

    IF NOT has_applicable_item THEN
      RETURN jsonb_build_object(
        'success', false,
        'discount_cents', 0,
        'new_subtotal_cents', COALESCE(p_subtotal_cents, 0),
        'promo', to_jsonb(promo_row),
        'errors', jsonb_build_array('This promo applies to specific drinks only')
      );
    END IF;
  END IF;

  IF promo_row.promo_type IN ('percentage', 'fixed_amount') THEN
    IF promo_row.min_order_cents IS NOT NULL AND COALESCE(p_subtotal_cents, 0) < promo_row.min_order_cents THEN
      RETURN jsonb_build_object(
        'success', false,
        'discount_cents', 0,
        'new_subtotal_cents', COALESCE(p_subtotal_cents, 0),
        'promo', to_jsonb(promo_row),
        'errors', jsonb_build_array(
          'Minimum order of ₱' || to_char(promo_row.min_order_cents / 100.0, 'FM999999999.00') || ' required'
        )
      );
    END IF;

    IF promo_row.promo_type = 'percentage' THEN
      discount_cents := ROUND(COALESCE(p_subtotal_cents, 0) * (COALESCE(promo_row.discount_percentage, 0) / 100.0));
    ELSE
      discount_cents := COALESCE(promo_row.discount_cents, 0);
    END IF;
  ELSIF promo_row.promo_type = 'bundle' THEN
    SELECT * INTO bundle_row
    FROM promo_bundles
    WHERE promo_id = promo_row.id
    LIMIT 1;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'discount_cents', 0,
        'new_subtotal_cents', COALESCE(p_subtotal_cents, 0),
        'promo', to_jsonb(promo_row),
        'errors', jsonb_build_array('Bundle configuration not found')
      );
    END IF;

    IF bundle_row.size_12oz_quantity > 0 AND count_12oz < bundle_row.size_12oz_quantity THEN
      RETURN jsonb_build_object(
        'success', false,
        'discount_cents', 0,
        'new_subtotal_cents', COALESCE(p_subtotal_cents, 0),
        'promo', to_jsonb(promo_row),
        'errors', jsonb_build_array('This bundle requires ' || bundle_row.size_12oz_quantity || 'x 12oz drink(s)')
      );
    END IF;

    IF bundle_row.size_16oz_quantity > 0 AND count_16oz < bundle_row.size_16oz_quantity THEN
      RETURN jsonb_build_object(
        'success', false,
        'discount_cents', 0,
        'new_subtotal_cents', COALESCE(p_subtotal_cents, 0),
        'promo', to_jsonb(promo_row),
        'errors', jsonb_build_array('This bundle requires ' || bundle_row.size_16oz_quantity || 'x 16oz drink(s)')
      );
    END IF;

    IF total_items < bundle_row.items_quantity THEN
      RETURN jsonb_build_object(
        'success', false,
        'discount_cents', 0,
        'new_subtotal_cents', COALESCE(p_subtotal_cents, 0),
        'promo', to_jsonb(promo_row),
        'requires_action', jsonb_build_object(
          'type', 'add_items',
          'options', jsonb_build_object('required', bundle_row.items_quantity)
        ),
        'errors', jsonb_build_array('This bundle requires more items')
      );
    END IF;

    IF bundle_row.allow_variants THEN
      IF p_selected_variant_id IS NULL THEN
        RETURN jsonb_build_object(
          'success', false,
          'discount_cents', 0,
          'new_subtotal_cents', COALESCE(p_subtotal_cents, 0),
          'promo', to_jsonb(promo_row),
          'requires_action', jsonb_build_object(
            'type', 'select_variant',
            'options', COALESCE(
              (
                SELECT jsonb_agg(
                  jsonb_build_object(
                    'id', v.id,
                    'variant_name', v.variant_name,
                    'price_cents', v.price_cents
                  )
                )
                FROM promo_variants v
                WHERE v.promo_id = promo_row.id AND v.is_active = true
              ),
              '[]'::jsonb
            )
          ),
          'errors', jsonb_build_array()
        );
      ELSE
        SELECT price_cents INTO variant_price_cents
        FROM promo_variants
        WHERE id = p_selected_variant_id
          AND is_active = true;
        IF variant_price_cents IS NULL THEN
          RETURN jsonb_build_object(
            'success', false,
            'discount_cents', 0,
            'new_subtotal_cents', COALESCE(p_subtotal_cents, 0),
            'promo', to_jsonb(promo_row),
            'errors', jsonb_build_array('Selected variant is invalid')
          );
        END IF;
        discount_cents := GREATEST(0, COALESCE(p_subtotal_cents, 0) - variant_price_cents);
      END IF;
    ELSE
      discount_cents := GREATEST(0, COALESCE(p_subtotal_cents, 0) - COALESCE(promo_row.bundle_price_cents, 0));
    END IF;
  ELSIF promo_row.promo_type = 'free_addon' THEN
    SELECT * INTO free_addon_row
    FROM promo_free_addons
    WHERE promo_id = promo_row.id
    LIMIT 1;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'discount_cents', 0,
        'new_subtotal_cents', COALESCE(p_subtotal_cents, 0),
        'promo', to_jsonb(promo_row),
        'errors', jsonb_build_array('Free add-on configuration not found')
      );
    END IF;

    IF free_addon_row.qualifying_size_ml IS NOT NULL THEN
      IF free_addon_row.qualifying_size_ml = 355 AND count_12oz = 0 THEN
        RETURN jsonb_build_object(
          'success', false,
          'discount_cents', 0,
          'new_subtotal_cents', COALESCE(p_subtotal_cents, 0),
          'promo', to_jsonb(promo_row),
          'errors', jsonb_build_array('Add a qualifying drink to use this promo')
        );
      ELSIF free_addon_row.qualifying_size_ml = 473 AND count_16oz = 0 THEN
        RETURN jsonb_build_object(
          'success', false,
          'discount_cents', 0,
          'new_subtotal_cents', COALESCE(p_subtotal_cents, 0),
          'promo', to_jsonb(promo_row),
          'errors', jsonb_build_array('Add a qualifying drink to use this promo')
        );
      END IF;
    END IF;

    IF free_addon_row.qualifying_drink_id IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(cart_json) AS item
        WHERE (item->>'drink_id')::UUID = free_addon_row.qualifying_drink_id
      ) INTO has_applicable_item;
      IF NOT has_applicable_item THEN
        RETURN jsonb_build_object(
          'success', false,
          'discount_cents', 0,
          'new_subtotal_cents', COALESCE(p_subtotal_cents, 0),
          'promo', to_jsonb(promo_row),
          'errors', jsonb_build_array('Add a qualifying drink to use this promo')
        );
      END IF;
    END IF;

    IF free_addon_row.can_choose_addon THEN
      max_free_qty := free_addon_row.max_free_quantity;
      IF p_selected_addon_id IS NULL THEN
        RETURN jsonb_build_object(
          'success', false,
          'discount_cents', 0,
          'new_subtotal_cents', COALESCE(p_subtotal_cents, 0),
          'promo', to_jsonb(promo_row),
          'requires_action', jsonb_build_object(
            'type', 'select_addon',
            'options', jsonb_build_object('maxFreeQuantity', COALESCE(max_free_qty, 1))
          ),
          'errors', jsonb_build_array()
        );
      END IF;
      SELECT price_php INTO addon_price_php
      FROM ingredient_pricing_effective
      WHERE ingredient_id = p_selected_addon_id
        AND is_active = true
      LIMIT 1;
      discount_cents := ROUND(COALESCE(addon_price_php, 0) * 100);
    ELSE
      IF free_addon_row.free_addon_id IS NOT NULL THEN
        SELECT price_php INTO addon_price_php
        FROM ingredient_pricing_effective
        WHERE ingredient_id = free_addon_row.free_addon_id
          AND is_active = true
        LIMIT 1;
        discount_cents := ROUND(COALESCE(addon_price_php, 0) * 100);
      ELSE
        discount_cents := 0;
      END IF;
    END IF;
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'discount_cents', 0,
      'new_subtotal_cents', COALESCE(p_subtotal_cents, 0),
      'promo', to_jsonb(promo_row),
      'errors', jsonb_build_array('Unsupported promo type')
    );
  END IF;

  IF promo_row.max_discount_cents IS NOT NULL AND discount_cents > promo_row.max_discount_cents THEN
    discount_cents := promo_row.max_discount_cents;
  END IF;

  IF discount_cents > COALESCE(p_subtotal_cents, 0) THEN
    discount_cents := COALESCE(p_subtotal_cents, 0);
  END IF;

  new_subtotal_cents := COALESCE(p_subtotal_cents, 0) - discount_cents;

  RETURN jsonb_build_object(
    'success', true,
    'discount_cents', discount_cents,
    'new_subtotal_cents', new_subtotal_cents,
    'promo', to_jsonb(promo_row),
    'applied_promo', jsonb_build_object(
      'promo_id', promo_row.id,
      'code', promo_row.code,
      'description', COALESCE(promo_row.description, promo_row.name)
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION validate_apply_promo(TEXT, INTEGER, JSONB, UUID, UUID, TEXT) TO anon, authenticated;
