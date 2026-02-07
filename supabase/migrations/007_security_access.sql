-- ============================================================
-- Security hardening: storage + tracking RPC + staff policies
-- ============================================================

-- Make payment proofs bucket private if it exists
UPDATE storage.buckets
SET public = false
WHERE id = 'payment-proofs';

-- Storage policies for payment proofs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'payment_proofs insert (anon/auth)'
  ) THEN
    CREATE POLICY "payment_proofs insert (anon/auth)"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'payment-proofs');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'payment_proofs read (staff/admin)'
  ) THEN
    CREATE POLICY "payment_proofs read (staff/admin)"
      ON storage.objects FOR SELECT
      USING (
        bucket_id = 'payment-proofs'
        AND EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.user_id = auth.uid()
            AND profiles.role IN ('staff', 'admin')
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'payment_proofs delete (staff/admin)'
  ) THEN
    CREATE POLICY "payment_proofs delete (staff/admin)"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'payment-proofs'
        AND EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.user_id = auth.uid()
            AND profiles.role IN ('staff', 'admin')
        )
      );
  END IF;
END $$;

-- Staff/admin read/update access for orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'orders'
      AND policyname = 'orders staff/admin read'
  ) THEN
    CREATE POLICY "orders staff/admin read"
      ON orders FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.user_id = auth.uid()
            AND profiles.role IN ('staff', 'admin')
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'orders'
      AND policyname = 'orders staff/admin update'
  ) THEN
    CREATE POLICY "orders staff/admin update"
      ON orders FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.user_id = auth.uid()
            AND profiles.role IN ('staff', 'admin')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.user_id = auth.uid()
            AND profiles.role IN ('staff', 'admin')
        )
      );
  END IF;
END $$;

-- Staff/admin read access for order_items and ingredients
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_ingredients ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'order_items'
      AND policyname = 'order_items staff/admin read'
  ) THEN
    CREATE POLICY "order_items staff/admin read"
      ON order_items FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.user_id = auth.uid()
            AND profiles.role IN ('staff', 'admin')
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'order_item_ingredients'
      AND policyname = 'order_item_ingredients staff/admin read'
  ) THEN
    CREATE POLICY "order_item_ingredients staff/admin read"
      ON order_item_ingredients FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.user_id = auth.uid()
            AND profiles.role IN ('staff', 'admin')
        )
      );
  END IF;
END $$;

-- Tracking RPC for public access (security definer)
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
  SELECT id, created_at, pickup_time, status, guest_name, guest_phone, tracking_code
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
