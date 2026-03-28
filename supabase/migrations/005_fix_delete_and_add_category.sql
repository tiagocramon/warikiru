-- ============================================
-- 1. Add category column to expenses
-- ============================================
ALTER TABLE expenses ADD COLUMN category TEXT NOT NULL DEFAULT 'outros';

-- ============================================
-- 2. Safe delete group function (disables audit trigger)
-- ============================================
CREATE OR REPLACE FUNCTION safe_delete_group(p_group_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Verify ownership
  IF NOT EXISTS (
    SELECT 1 FROM groups WHERE id = p_group_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only the group owner can delete the group';
  END IF;

  -- Disable audit triggers temporarily to avoid cascade conflicts
  ALTER TABLE group_members DISABLE TRIGGER trg_group_members_audit;
  ALTER TABLE expenses DISABLE TRIGGER trg_expenses_audit;
  ALTER TABLE payments DISABLE TRIGGER trg_payments_audit;

  -- Delete (cascades to members, expenses, payments, audit_logs)
  DELETE FROM groups WHERE id = p_group_id;

  -- Re-enable triggers
  ALTER TABLE group_members ENABLE TRIGGER trg_group_members_audit;
  ALTER TABLE expenses ENABLE TRIGGER trg_expenses_audit;
  ALTER TABLE payments ENABLE TRIGGER trg_payments_audit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
