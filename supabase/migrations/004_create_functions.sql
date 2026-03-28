-- ============================================
-- Create group with owner as active member (atomic)
-- ============================================
CREATE OR REPLACE FUNCTION create_group_with_owner(
  p_name TEXT,
  p_owner_name TEXT,
  p_owner_percentage NUMERIC
)
RETURNS UUID AS $$
DECLARE
  _group_id UUID;
BEGIN
  INSERT INTO groups (owner_id, name)
  VALUES (auth.uid(), p_name)
  RETURNING id INTO _group_id;

  INSERT INTO group_members (group_id, user_id, name, percentage, status, joined_at)
  VALUES (_group_id, auth.uid(), p_owner_name, p_owner_percentage, 'active', now());

  RETURN _group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Accept invitation (link pending member to user)
-- ============================================
CREATE OR REPLACE FUNCTION accept_invitation(p_group_id UUID)
RETURNS VOID AS $$
DECLARE
  _email TEXT;
BEGIN
  SELECT email INTO _email FROM auth.users WHERE id = auth.uid();

  UPDATE group_members
  SET
    user_id = auth.uid(),
    status = 'active',
    joined_at = now()
  WHERE group_id = p_group_id
    AND invited_email = _email
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No pending invitation found for this email in this group';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Auto-link pending invites on user registration
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

-- Trigger on auth.users to auto-link on registration
CREATE TRIGGER trg_link_invites_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION link_pending_invitations();
