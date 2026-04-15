-- ============================================================
-- HUB SOLER — Migration 004
-- Bling V3 OAuth 2.0 Token Storage
-- ============================================================

-- Table to store Bling API tokens (single row per organization)
CREATE TABLE public.bling_tokens (
  id            INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Ensures single token per org
  access_token  TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Comments for clarity
COMMENT ON TABLE public.bling_tokens IS 'Stores Bling V3 OAuth tokens. Single row (id=1) per organization.';
COMMENT ON COLUMN public.bling_tokens.id IS 'Fixed at 1 to enforce single token per organization';
COMMENT ON COLUMN public.bling_tokens.expires_at IS 'UTC timestamp when access_token expires';

-- Enable RLS
ALTER TABLE public.bling_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies: admin and finance roles only
CREATE POLICY "bling_tokens_select_admin_finance"
  ON public.bling_tokens FOR SELECT
  USING (public.get_user_role() IN ('admin', 'finance'));

CREATE POLICY "bling_tokens_insert_admin_finance"
  ON public.bling_tokens FOR INSERT
  WITH CHECK (public.get_user_role() IN ('admin', 'finance'));

CREATE POLICY "bling_tokens_update_admin_finance"
  ON public.bling_tokens FOR UPDATE
  USING (public.get_user_role() IN ('admin', 'finance'));

CREATE POLICY "bling_tokens_delete_admin_finance"
  ON public.bling_tokens FOR DELETE
  USING (public.get_user_role() IN ('admin', 'finance'));

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_bling_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_bling_tokens_updated_at
  BEFORE UPDATE ON public.bling_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_bling_tokens_updated_at();
