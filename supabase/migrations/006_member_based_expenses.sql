-- ============================================
-- 1. Fix audit trigger to handle NULL auth.uid()
--    (needed for auto-link trigger during signup)
-- ============================================
CREATE OR REPLACE FUNCTION fn_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  _action TEXT;
  _group_id UUID;
  _old JSONB;
  _new JSONB;
  _uid UUID;
BEGIN
  _uid := auth.uid();

  -- Skip audit if no authenticated user (e.g., auto-link on signup)
  IF _uid IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    _action := 'create';
    _group_id := NEW.group_id;
    _old := NULL;
    _new := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    _action := 'update';
    _group_id := NEW.group_id;
    _old := to_jsonb(OLD);
    _new := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    _action := 'delete';
    _group_id := OLD.group_id;
    _old := to_jsonb(OLD);
    _new := NULL;
  END IF;

  INSERT INTO audit_logs (group_id, user_id, action, entity_type, entity_id, old_value, new_value)
  VALUES (
    _group_id,
    _uid,
    _action,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    _old,
    _new
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. Re-add auto-link trigger for signup
-- ============================================
CREATE OR REPLACE FUNCTION link_pending_invitations()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE group_members
  SET
    user_id = NEW.id,
    status = 'active',
    joined_at = now()
  WHERE invited_email = NEW.email
    AND status = 'pending'
    AND user_id IS NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop if exists from previous attempt, then create
DROP TRIGGER IF EXISTS trg_link_invites_on_signup ON auth.users;
CREATE TRIGGER trg_link_invites_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION link_pending_invitations();

-- ============================================
-- 3. Change expenses: paid_by_user_id -> paid_by_member_id
-- ============================================
ALTER TABLE expenses ADD COLUMN paid_by_member_id UUID REFERENCES group_members(id);

-- Migrate existing data (if any)
UPDATE expenses e
SET paid_by_member_id = gm.id
FROM group_members gm
WHERE gm.user_id = e.paid_by_user_id
  AND gm.group_id = e.group_id;

-- For any expenses that couldn't be mapped, delete them (shouldn't happen)
DELETE FROM expenses WHERE paid_by_member_id IS NULL;

-- Make it NOT NULL and drop old column
ALTER TABLE expenses ALTER COLUMN paid_by_member_id SET NOT NULL;
ALTER TABLE expenses DROP COLUMN paid_by_user_id;

-- ============================================
-- 4. Update RLS policy for expenses INSERT
--    (paid_by_member_id must belong to the same group)
-- ============================================
DROP POLICY IF EXISTS "Members can create expenses" ON expenses;
CREATE POLICY "Members can create expenses"
  ON expenses FOR INSERT
  WITH CHECK (
    is_group_member(group_id)
    AND created_by_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM group_members
      WHERE id = paid_by_member_id AND group_id = expenses.group_id
    )
  );
