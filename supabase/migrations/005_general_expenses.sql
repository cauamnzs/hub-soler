-- Migration: General Expenses Table
-- This table stores general expenses not linked to specific trips

CREATE TABLE general_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  amount_brl NUMERIC(10, 2) NOT NULL,
  expense_date DATE NOT NULL,
  receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for security
ALTER TABLE general_expenses ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users (admin access)
CREATE POLICY "general_expenses_admin_all" ON general_expenses
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create index on expense_date for efficient filtering
CREATE INDEX idx_general_expenses_date ON general_expenses(expense_date DESC);

-- Create index on created_at for sorting
CREATE INDEX idx_general_expenses_created ON general_expenses(created_at DESC);
