-- ============================================
-- Automatic audit logging via triggers
-- ============================================
CREATE OR REPLACE FUNCTION fn_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  _action TEXT;
  _group_id UUID;
  _old JSONB;
  _new JSONB;
BEGIN
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
    auth.uid(),
    _action,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    _old,
    _new
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach triggers
CREATE TRIGGER trg_expenses_audit
  AFTER INSERT OR UPDATE OR DELETE ON expenses
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

CREATE TRIGGER trg_payments_audit
  AFTER INSERT ON payments
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

CREATE TRIGGER trg_group_members_audit
  AFTER INSERT OR UPDATE OR DELETE ON group_members
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
