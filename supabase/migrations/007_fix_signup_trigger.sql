-- ============================================
-- Fix: link_pending_invitations must disable
-- the audit trigger before updating group_members,
-- otherwise the audit INSERT fails during signup
-- (auth.uid() is NULL in the signup trigger context)
-- ============================================

CREATE OR REPLACE FUNCTION link_pending_invitations()
RETURNS TRIGGER AS $$
BEGIN
  -- Disable audit trigger during auto-link
  ALTER TABLE group_members DISABLE TRIGGER trg_group_members_audit;

  UPDATE group_members
  SET
    user_id = NEW.id,
    status  = 'active',
    joined_at = now()
  WHERE invited_email = NEW.email
    AND status = 'pending'
    AND user_id IS NULL;

  -- Re-enable audit trigger
  ALTER TABLE group_members ENABLE TRIGGER trg_group_members_audit;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
