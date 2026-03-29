-- Recurring expenses table
CREATE TABLE recurring_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'outros',
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 1 AND 255),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  day_of_month INTEGER NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
  paid_by_member_id UUID NOT NULL REFERENCES group_members(id),
  created_by_user_id UUID NOT NULL REFERENCES auth.users(id),
  custom_percentages JSONB,
  frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('monthly')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_generated_month TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recurring_expenses_group ON recurring_expenses(group_id);

-- RLS
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view recurring expenses"
  ON recurring_expenses FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = recurring_expenses.group_id
      AND group_members.user_id = auth.uid()
      AND group_members.status = 'active'
  ));

CREATE POLICY "Members can create recurring expenses"
  ON recurring_expenses FOR INSERT
  WITH CHECK (
    created_by_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = recurring_expenses.group_id
        AND group_members.user_id = auth.uid()
        AND group_members.status = 'active'
    )
  );

CREATE POLICY "Creator can update recurring expenses"
  ON recurring_expenses FOR UPDATE
  USING (created_by_user_id = auth.uid());

CREATE POLICY "Creator or owner can delete recurring expenses"
  ON recurring_expenses FOR DELETE
  USING (
    created_by_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = recurring_expenses.group_id
        AND groups.owner_id = auth.uid()
    )
  );
