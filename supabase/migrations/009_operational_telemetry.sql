-- ============================================================
-- Operational telemetry (lightweight client events)
-- ============================================================

CREATE TABLE IF NOT EXISTS client_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  session_id TEXT,
  user_id UUID,
  event_name TEXT NOT NULL,
  page_path TEXT,
  metadata JSONB
);

ALTER TABLE client_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'client_events'
      AND policyname = 'client_events insert (anon/auth)'
  ) THEN
    CREATE POLICY "client_events insert (anon/auth)"
      ON client_events FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'client_events'
      AND policyname = 'client_events read (staff/admin)'
  ) THEN
    CREATE POLICY "client_events read (staff/admin)"
      ON client_events FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.user_id = auth.uid()
            AND profiles.role IN ('staff', 'admin')
        )
      );
  END IF;
END $$;
