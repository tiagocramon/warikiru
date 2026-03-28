-- ============================================
-- Fix accept_invitation: handle already-active members gracefully
-- ============================================
CREATE OR REPLACE FUNCTION accept_invitation(p_group_id UUID)
RETURNS VOID AS $$
DECLARE
  _email TEXT;
  _existing_status member_status;
BEGIN
  SELECT email INTO _email FROM auth.users WHERE id = auth.uid();

  -- Check if user is already an active member
  SELECT status INTO _existing_status
  FROM group_members
  WHERE group_id = p_group_id
    AND user_id = auth.uid()
    AND status = 'active';

  IF FOUND THEN
    RETURN; -- Already active, nothing to do
  END IF;

  -- Try to accept a pending invitation by email
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
