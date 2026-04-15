-- ============================================================
-- HUB SOLER — Migration 003
-- Fix trips RLS to allow any authenticated user to create trips
-- Add trigger to auto-create profile on signup
-- ============================================================

-- ============================================================
-- 1. Auto-create profile on user signup
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'operations'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. Fix trips RLS policies
-- ============================================================

-- Allow any authenticated user to insert a trip where they are the creator
CREATE POLICY "trips_insert_own"
  ON public.trips FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Update the manage policy to only apply to UPDATE/DELETE (not INSERT)
-- This keeps admin/finance control for modifications, but allows creators to insert
DROP POLICY IF EXISTS "trips_manage" ON public.trips;

-- Separate policies for clarity
CREATE POLICY "trips_update_admin_finance_or_creator"
  ON public.trips FOR UPDATE
  USING (
    public.get_user_role() IN ('admin', 'finance')
    OR (auth.uid() = created_by AND status = 'planning')
  );

CREATE POLICY "trips_delete_admin_finance"
  ON public.trips FOR DELETE
  USING (public.get_user_role() IN ('admin', 'finance'));
