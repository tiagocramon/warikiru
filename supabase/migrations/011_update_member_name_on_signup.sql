-- Migration: 011_update_member_name_on_signup
-- Quando um convidado faz signup com um nome, atualiza o group_members.name
-- com o nome fornecido no cadastro (raw_user_meta_data->>'name').

CREATE OR REPLACE FUNCTION public.link_pending_invitations()
RETURNS TRIGGER AS $$
DECLARE
  _member RECORD;
  _signup_name TEXT;
BEGIN
  _signup_name := NEW.raw_user_meta_data->>'name';

  FOR _member IN
    UPDATE public.group_members
    SET
      user_id   = NEW.id,
      status    = 'active',
      joined_at = now(),
      name      = COALESCE(NULLIF(_signup_name, ''), name)
    WHERE invited_email = NEW.email
      AND status = 'pending'
      AND user_id IS NULL
    RETURNING *
  LOOP
    -- Insert audit log manually since auth.uid() is NULL during signup
    INSERT INTO public.audit_logs (group_id, user_id, action, entity_type, entity_id, old_value, new_value)
    VALUES (
      _member.group_id,
      NEW.id,
      'update',
      'group_members',
      _member.id,
      jsonb_build_object(
        'name',          _member.name,
        'percentage',    _member.percentage,
        'invited_email', _member.invited_email,
        'status',        'pending'
      ),
      to_jsonb(_member)
    );
  END LOOP;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error linking pending invitation to new user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
