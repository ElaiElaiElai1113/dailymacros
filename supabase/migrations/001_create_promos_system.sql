-- ============================================================
-- Daily Macros Promo/Discount System Database Migration
-- ============================================================
-- Run this in Supabase SQL Editor to create the promo system

-- ============================================================
-- 1. CORE PROMO DEFINITIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS promos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,

  -- Promo type classification
  promo_type VARCHAR(20) NOT NULL CHECK (promo_type IN (
    'bundle',           -- Fixed bundle at set price (GYM/STUDY BUDDY)
    'percentage',       -- Percentage discount
    'fixed_amount',     -- Fixed amount discount
    'free_addon',       -- Free add-on/item (SOLO BOOST)
    'buy_x_get_y'       -- Buy X get Y free
  )),

  -- Discount values (based on type)
  discount_percentage NUMERIC(5,2) CHECK (discount_percentage BETWEEN 0 AND 100),
  discount_cents INTEGER CHECK (discount_cents >= 0),
  bundle_price_cents INTEGER CHECK (bundle_price_cents >= 0),

  -- Usage constraints
  min_order_cents INTEGER CHECK (min_order_cents >= 0),
  max_discount_cents INTEGER CHECK (max_discount_cents >= 0),
  usage_limit_per_customer INTEGER CHECK (usage_limit_per_customer > 0),
  usage_limit_total INTEGER CHECK (usage_limit_total > 0),

  -- Time constraints
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,

  -- Targeting
  applicable_drink_ids UUID[],        -- NULL = all drinks
  applicable_size_mls INTEGER[],       -- Specific sizes (e.g., [355, 473])
  required_categories TEXT[],          -- Category filters
  customer_type VARCHAR(20) CHECK (customer_type IN ('all', 'new', 'returning')),

  -- Status
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,          -- Higher = applied first

  -- Metadata
  image_url TEXT,
  terms TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Track creator
  created_by UUID
);

-- Add foreign key for created_by if profiles table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    ALTER TABLE promos
      ADD CONSTRAINT IF NOT EXISTS promos_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES profiles(id);
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_promos_code ON promos(code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_promos_validity ON promos(valid_from, valid_until) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_promos_type ON promos(promo_type) WHERE is_active = true;

-- ============================================================
-- 2. BUNDLE CONFIGURATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS promo_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_id UUID NOT NULL,
  bundle_name VARCHAR(100) NOT NULL,
  requires_multiple_items BOOLEAN DEFAULT true,
  items_quantity INTEGER DEFAULT 2,
  size_12oz_quantity INTEGER DEFAULT 0,
  size_16oz_quantity INTEGER DEFAULT 0,
  allow_variants BOOLEAN DEFAULT false,
  variant_types TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key for promo_id
ALTER TABLE promo_bundles
  ADD CONSTRAINT IF NOT EXISTS promo_bundles_promo_id_fkey
  FOREIGN KEY (promo_id) REFERENCES promos(id) ON DELETE CASCADE;

-- ============================================================
-- 3. FREE ADD-ON CONFIGURATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS promo_free_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_id UUID NOT NULL,
  qualifying_drink_id UUID,
  qualifying_size_ml INTEGER,
  free_addon_id UUID,
  free_addon_quantity INTEGER DEFAULT 1,
  max_free_quantity INTEGER DEFAULT 1,
  can_choose_addon BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key for promo_id
ALTER TABLE promo_free_addons
  ADD CONSTRAINT IF NOT EXISTS promo_free_addons_promo_id_fkey
  FOREIGN KEY (promo_id) REFERENCES promos(id) ON DELETE CASCADE;

-- Add foreign key for qualifying_drink_id (only if drinks table exists with id column)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drinks' AND column_name = 'id'
  ) THEN
    ALTER TABLE promo_free_addons
      ADD CONSTRAINT IF NOT EXISTS promo_free_addons_qualifying_drink_id_fkey
      FOREIGN KEY (qualifying_drink_id) REFERENCES drinks(id);
  END IF;
END $$;

-- Add foreign key for free_addon_id (only if ingredients table exists with id column)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ingredients' AND column_name = 'id'
  ) THEN
    ALTER TABLE promo_free_addons
      ADD CONSTRAINT IF NOT EXISTS promo_free_addons_free_addon_id_fkey
      FOREIGN KEY (free_addon_id) REFERENCES ingredients(id);
  END IF;
END $$;

-- ============================================================
-- 4. PROMO VARIANTS TABLE (for pricing variations)
-- ============================================================
CREATE TABLE IF NOT EXISTS promo_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_id UUID NOT NULL,
  variant_name VARCHAR(50) NOT NULL,
  price_cents INTEGER NOT NULL,
  drink_config JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key for promo_id
ALTER TABLE promo_variants
  ADD CONSTRAINT IF NOT EXISTS promo_variants_promo_id_fkey
  FOREIGN KEY (promo_id) REFERENCES promos(id) ON DELETE CASCADE;

-- ============================================================
-- 5. PROMO USAGE TRACKING TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS promo_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_id UUID NOT NULL,
  order_id UUID NOT NULL,
  customer_identifier VARCHAR(255),
  discount_cents INTEGER NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key for promo_id
ALTER TABLE promo_usage
  ADD CONSTRAINT IF NOT EXISTS promo_usage_promo_id_fkey
  FOREIGN KEY (promo_id) REFERENCES promos(id) ON DELETE CASCADE;

-- Add foreign key for order_id (only if orders table exists with id column)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'id'
  ) THEN
    ALTER TABLE promo_usage
      ADD CONSTRAINT IF NOT EXISTS promo_usage_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add unique constraint to prevent abuse
ALTER TABLE promo_usage
  ADD CONSTRAINT IF NOT EXISTS unique_customer_promo
  UNIQUE (promo_id, customer_identifier);

-- ============================================================
-- 6. MODIFY EXISTING ORDERS TABLE
-- ============================================================
-- Add promo-related columns to orders table (only if orders table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
    -- Add promo_id column with foreign key
    ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS promo_id UUID;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'promos') THEN
      ALTER TABLE orders
        ADD CONSTRAINT IF NOT EXISTS orders_promo_id_fkey
        FOREIGN KEY (promo_id) REFERENCES promos(id);
    END IF;

    -- Add other promo columns
    ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS promo_discount_cents INTEGER DEFAULT 0 CHECK (promo_discount_cents >= 0),
      ADD COLUMN IF NOT EXISTS promo_code_applied VARCHAR(50);
  END IF;
END $$;

-- ============================================================
-- 7. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Promos table RLS
ALTER TABLE promos ENABLE ROW LEVEL SECURITY;

-- Customers can only read active promos
CREATE POLICY IF NOT EXISTS "Customers can view active promos"
  ON promos FOR SELECT
  USING (is_active = true);

-- Staff/Admin can do everything
CREATE POLICY IF NOT EXISTS "Staff/Admin can manage promos"
  ON promos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('staff', 'admin')
    )
  );

-- Promo bundles RLS
ALTER TABLE promo_bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Anyone can view promo bundles"
  ON promo_bundles FOR SELECT
  USING (true);

CREATE POLICY IF NOT EXISTS "Staff/Admin can manage promo bundles"
  ON promo_bundles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('staff', 'admin')
    )
  );

-- Promo free add-ons RLS
ALTER TABLE promo_free_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Anyone can view promo free add-ons"
  ON promo_free_addons FOR SELECT
  USING (true);

CREATE POLICY IF NOT EXISTS "Staff/Admin can manage promo free add-ons"
  ON promo_free_addons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('staff', 'admin')
    )
  );

-- Promo variants RLS
ALTER TABLE promo_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Anyone can view active promo variants"
  ON promo_variants FOR SELECT
  USING (is_active = true);

CREATE POLICY IF NOT EXISTS "Staff/Admin can manage promo variants"
  ON promo_variants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('staff', 'admin')
    )
  );

-- Promo usage RLS
ALTER TABLE promo_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Staff/Admin can view promo usage"
  ON promo_usage FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('staff', 'admin')
    )
  );

CREATE POLICY IF NOT EXISTS "System can insert promo usage"
  ON promo_usage FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- 8. HELPER FUNCTIONS
-- ============================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_promos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS promos_updated_at ON promos;
CREATE TRIGGER promos_updated_at
  BEFORE UPDATE ON promos
  FOR EACH ROW
  EXECUTE FUNCTION update_promos_updated_at();

-- Function to check if promo is valid
CREATE OR REPLACE FUNCTION is_promo_valid(promo_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_promo RECORD;
  v_usage_count INTEGER;
BEGIN
  -- Get promo details
  SELECT * INTO v_promo
  FROM promos
  WHERE id = promo_uuid AND is_active = true;

  -- Return false if promo doesn't exist or is inactive
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Check time validity
  IF v_promo.valid_from > NOW() THEN
    RETURN false;
  END IF;

  IF v_promo.valid_until IS NOT NULL AND v_promo.valid_until < NOW() THEN
    RETURN false;
  END IF;

  -- Check usage limit
  IF v_promo.usage_limit_total IS NOT NULL THEN
    SELECT COUNT(*) INTO v_usage_count
    FROM promo_usage
    WHERE promo_id = promo_uuid;

    IF v_usage_count >= v_promo.usage_limit_total THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
