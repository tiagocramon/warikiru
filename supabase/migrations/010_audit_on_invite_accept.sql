-- Migration: 010_audit_on_invite_accept
-- Fix: Gerar audit log quando link_pending_invitations() atualiza o status
-- do membro de 'pending' para 'active' durante o signup.
-- O fn_audit_log() ignora o UPDATE porque auth.uid() é NULL nesse contexto,
-- então inserimos o audit log manualmente usando NEW.id como user_id.

CREATE OR REPLACE FUNCTION public.link_pending_invitations()
RETURNS TRIGGER AS $$
DECLARE
  _member RECORD;
BEGIN
  FOR _member IN
    UPDATE public.group_members
    SET
      user_id   = NEW.id,
      status    = 'active',
      joined_at = now()
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
