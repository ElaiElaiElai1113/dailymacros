-- ============================================================
-- Add price per drink size
-- ============================================================

ALTER TABLE drink_sizes
  ADD COLUMN IF NOT EXISTS price_php NUMERIC;
