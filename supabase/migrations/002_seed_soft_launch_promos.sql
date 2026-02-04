-- ============================================================
-- Daily Macros Soft Launch Promo Data Seeding
-- ============================================================
-- Run this in Supabase SQL Editor after creating the promo tables
-- This will seed the GYM/STUDY BUDDY, DAILY DUO, and SOLO BOOST promos

-- ============================================================
-- 1. GYM/STUDY BUDDY: ₱410 for 12oz + 16oz combo
-- ============================================================
INSERT INTO promos (
  code,
  name,
  description,
  promo_type,
  bundle_price_cents,
  is_active,
  valid_from,
  image_url,
  terms
) VALUES (
  'GYMSTUDY',
  'GYM/STUDY BUDDY',
  'Power combo with 12oz + 16oz drinks. Perfect for gym sessions or long study sessions.',
  'bundle',
  41000,  -- ₱410 in cents
  true,
  NOW(),
  NULL,
  'Valid for combinations with one 12oz and one 16oz drink. Cannot be combined with other promos.'
)
ON CONFLICT (code) DO NOTHING;

-- Get the promo ID for GYMSTUDY
DO $$
DECLARE
  gymstudy_id UUID;
BEGIN
  SELECT id INTO gymstudy_id FROM promos WHERE code = 'GYMSTUDY';

  IF gymstudy_id IS NOT NULL THEN
    INSERT INTO promo_bundles (
      promo_id,
      bundle_name,
      requires_multiple_items,
      items_quantity,
      size_12oz_quantity,
      size_16oz_quantity
    )
    SELECT
      gymstudy_id,
      '12oz + 16oz Combo',
      true,
      2,
      1,
      1
    WHERE NOT EXISTS (
      SELECT 1 FROM promo_bundles
      WHERE promo_id = gymstudy_id AND bundle_name = '12oz + 16oz Combo'
    );
  END IF;
END $$;

-- ============================================================
-- 2. DAILY DUO: ₱280/₱320/₱360 for two 12oz drinks
-- ============================================================
INSERT INTO promos (
  code,
  name,
  description,
  promo_type,
  is_active,
  valid_from,
  image_url,
  terms
) VALUES (
  'DAILYDUO',
  'DAILY DUO',
  'Two 12oz drinks at special bundle pricing. Perfect for sharing or having one now and one later.',
  'bundle',
  true,
  NOW(),
  NULL,
  'Valid for two 12oz drinks only. Variants available at different price points. Cannot be combined with other promos.'
)
ON CONFLICT (code) DO NOTHING;

-- Get the promo ID for DAILYDUO and create variants
DO $$
DECLARE
  dailyduo_id UUID;
BEGIN
  SELECT id INTO dailyduo_id FROM promos WHERE code = 'DAILYDUO';

  IF dailyduo_id IS NOT NULL THEN
    -- Regular variant: ₱280
    INSERT INTO promo_variants (promo_id, variant_name, price_cents, is_active)
    SELECT dailyduo_id, 'Regular', 28000, true
    WHERE NOT EXISTS (
      SELECT 1 FROM promo_variants
      WHERE promo_id = dailyduo_id AND variant_name = 'Regular'
    );

    -- Yogurt variant: ₱320
    INSERT INTO promo_variants (promo_id, variant_name, price_cents, is_active)
    SELECT dailyduo_id, 'Yogurt', 32000, true
    WHERE NOT EXISTS (
      SELECT 1 FROM promo_variants
      WHERE promo_id = dailyduo_id AND variant_name = 'Yogurt'
    );

    -- Premium variant: ₱360
    INSERT INTO promo_variants (promo_id, variant_name, price_cents, is_active)
    SELECT dailyduo_id, 'Premium', 36000, true
    WHERE NOT EXISTS (
      SELECT 1 FROM promo_variants
      WHERE promo_id = dailyduo_id AND variant_name = 'Premium'
    );

    -- Create bundle configuration
    INSERT INTO promo_bundles (
      promo_id,
      bundle_name,
      requires_multiple_items,
      items_quantity,
      size_12oz_quantity,
      allow_variants
    )
    SELECT
      dailyduo_id,
      'Two 12oz Drinks',
      true,
      2,
      2,
      true
    WHERE NOT EXISTS (
      SELECT 1 FROM promo_bundles
      WHERE promo_id = dailyduo_id AND bundle_name = 'Two 12oz Drinks'
    );
  END IF;
END $$;

-- ============================================================
-- 3. SOLO BOOST: 16oz + FREE ADD-ON
-- ============================================================
INSERT INTO promos (
  code,
  name,
  description,
  promo_type,
  is_active,
  valid_from,
  image_url,
  terms
) VALUES (
  'SOLOBOOST',
  'SOLO BOOST',
  'Upgrade to 16oz and get a FREE add-on! Perfect for when you want that extra boost.',
  'free_addon',
  true,
  NOW(),
  NULL,
  'Valid for 16oz drinks only. Includes one free add-on of your choice. Cannot be combined with other promos.'
)
ON CONFLICT (code) DO NOTHING;

-- Get the promo ID for SOLOBOOST and create free add-on configuration
DO $$
DECLARE
  soloboost_id UUID;
BEGIN
  SELECT id INTO soloboost_id FROM promos WHERE code = 'SOLOBOOST';

  IF soloboost_id IS NOT NULL THEN
    INSERT INTO promo_free_addons (
      promo_id,
      qualifying_size_ml,
      can_choose_addon,
      max_free_quantity,
      free_addon_quantity
    )
    SELECT
      soloboost_id,
      473,  -- 16oz in ml
      true,  -- Customer can choose add-on
      1,
      1
    WHERE NOT EXISTS (
      SELECT 1 FROM promo_free_addons
      WHERE promo_id = soloboost_id AND qualifying_size_ml = 473
    );
  END IF;
END $$;

-- ============================================================
-- SEEDING COMPLETE
-- ============================================================
-- The following promos have been created:
-- 1. GYMSTUDY - ₱410 for 12oz + 16oz combo
-- 2. DAILYDUO - ₱280/₱320/₱360 for two 12oz drinks (with variants)
-- 3. SOLOBOOST - 16oz + FREE ADD-ON

-- To verify, run:
-- SELECT code, name, promo_type, is_active FROM promos WHERE code IN ('GYMSTUDY', 'DAILYDUO', 'SOLOBOOST');
