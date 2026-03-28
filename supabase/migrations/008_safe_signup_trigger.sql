-- ============================================
-- 1. Replace fn_audit_log with safe search_path
-- ============================================
CREATE OR REPLACE FUNCTION public.fn_audit_log()
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

  INSERT INTO public.audit_logs (group_id, user_id, action, entity_type, entity_id, old_value, new_value)
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================
-- 2. Re-create the auto-link trigger cleanly
-- with explicit search_path
-- Avoid DISABLE TRIGGER which requires table ownership
-- ============================================
CREATE OR REPLACE FUNCTION public.link_pending_invitations()
RETURNS TRIGGER AS $$
BEGIN
  -- We rely on fn_audit_log's NULL check to avoid audit insert errors here
  UPDATE public.group_members
  SET
    user_id = NEW.id,
    status  = 'active',
    joined_at = now()
  WHERE invited_email = NEW.email
    AND status = 'pending'
    AND user_id IS NULL;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- If anything fails, still return NEW so the user creation doesn't rollback
    -- We can log this manually if needed, but the priority is letting the user sign up
    RAISE LOG 'Error linking pending invitation to new user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Ensure trigger is created
DROP TRIGGER IF EXISTS trg_link_invites_on_signup ON auth.users;
CREATE TRIGGER trg_link_invites_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.link_pending_invitations();
