-- ============================================================
-- RLS hardening for orders and size tables
-- ============================================================

-- drink_sizes: allow staff/admin writes
ALTER TABLE drink_sizes ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'drink_sizes'
      AND policyname = 'drink_sizes staff/admin write'
  ) THEN
    CREATE POLICY "drink_sizes staff/admin write"
      ON drink_sizes FOR ALL
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

-- drink_size_lines: allow staff/admin writes
ALTER TABLE drink_size_lines ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'drink_size_lines'
      AND policyname = 'drink_size_lines staff/admin write'
  ) THEN
    CREATE POLICY "drink_size_lines staff/admin write"
      ON drink_size_lines FOR ALL
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

-- orders: restrict direct inserts to staff/admin (RPC still works via SECURITY DEFINER)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'orders'
      AND policyname = 'insert order (any authed)'
  ) THEN
    DROP POLICY "insert order (any authed)" ON orders;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'orders'
      AND policyname = 'orders staff/admin insert'
  ) THEN
    CREATE POLICY "orders staff/admin insert"
      ON orders FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.user_id = auth.uid()
          AND profiles.role IN ('staff', 'admin')
        )
      );
  END IF;
END $$;

-- order_items: restrict direct inserts to staff/admin
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'order_items'
      AND policyname = 'insert items (authed)'
  ) THEN
    DROP POLICY "insert items (authed)" ON order_items;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'order_items'
      AND policyname = 'order_items staff/admin insert'
  ) THEN
    CREATE POLICY "order_items staff/admin insert"
      ON order_items FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.user_id = auth.uid()
          AND profiles.role IN ('staff', 'admin')
        )
      );
  END IF;
END $$;

-- order_item_ingredients: restrict direct inserts to staff/admin
ALTER TABLE order_item_ingredients ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'order_item_ingredients'
      AND policyname = 'insert line ingredients (authed)'
  ) THEN
    DROP POLICY "insert line ingredients (authed)" ON order_item_ingredients;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'order_item_ingredients'
      AND policyname = 'order_item_ingredients staff/admin insert'
  ) THEN
    CREATE POLICY "order_item_ingredients staff/admin insert"
      ON order_item_ingredients FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.user_id = auth.uid()
          AND profiles.role IN ('staff', 'admin')
        )
      );
  END IF;
END $$;
