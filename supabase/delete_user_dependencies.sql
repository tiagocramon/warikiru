-- Troque o UUID abaixo pelo user_id que falhou ao ser excluido do Auth.
-- Exemplo:
--   SELECT * FROM auth.users WHERE email = 'tiago.cramon@gmail.com';

BEGIN;

-- Evita falha do trigger de auditoria durante limpeza administrativa via SQL Editor.
ALTER TABLE expenses DISABLE TRIGGER trg_expenses_audit;
ALTER TABLE payments DISABLE TRIGGER trg_payments_audit;
ALTER TABLE group_members DISABLE TRIGGER trg_group_members_audit;

-- Diagnostico rapido
SELECT 'groups.owner_id' AS source, count(*) AS total
FROM groups
WHERE owner_id = '26d31146-c3f4-4a6c-b494-007ef76ea2fb'
UNION ALL
SELECT 'group_members.user_id' AS source, count(*) AS total
FROM group_members
WHERE user_id = '26d31146-c3f4-4a6c-b494-007ef76ea2fb'
UNION ALL
SELECT 'expenses.paid_by_user_id' AS source, count(*) AS total
FROM expenses
WHERE paid_by_user_id = '26d31146-c3f4-4a6c-b494-007ef76ea2fb'
UNION ALL
SELECT 'expenses.created_by_user_id' AS source, count(*) AS total
FROM expenses
WHERE created_by_user_id = '26d31146-c3f4-4a6c-b494-007ef76ea2fb'
UNION ALL
SELECT 'payments.from_user_id' AS source, count(*) AS total
FROM payments
WHERE from_user_id = '26d31146-c3f4-4a6c-b494-007ef76ea2fb'
UNION ALL
SELECT 'payments.to_user_id' AS source, count(*) AS total
FROM payments
WHERE to_user_id = '26d31146-c3f4-4a6c-b494-007ef76ea2fb'
UNION ALL
SELECT 'audit_logs.user_id' AS source, count(*) AS total
FROM audit_logs
WHERE user_id = '26d31146-c3f4-4a6c-b494-007ef76ea2fb';

-- Limpeza das dependencias do app
DELETE FROM audit_logs
WHERE user_id = '26d31146-c3f4-4a6c-b494-007ef76ea2fb';

DELETE FROM payments
WHERE from_user_id = '26d31146-c3f4-4a6c-b494-007ef76ea2fb'
   OR to_user_id = '26d31146-c3f4-4a6c-b494-007ef76ea2fb';

DELETE FROM expenses
WHERE paid_by_user_id = '26d31146-c3f4-4a6c-b494-007ef76ea2fb'
   OR created_by_user_id = '26d31146-c3f4-4a6c-b494-007ef76ea2fb';

UPDATE group_members
SET user_id = NULL,
    status = 'pending',
    joined_at = NULL
WHERE user_id = '26d31146-c3f4-4a6c-b494-007ef76ea2fb';

DELETE FROM groups
WHERE owner_id = '26d31146-c3f4-4a6c-b494-007ef76ea2fb';

ALTER TABLE expenses ENABLE TRIGGER trg_expenses_audit;
ALTER TABLE payments ENABLE TRIGGER trg_payments_audit;
ALTER TABLE group_members ENABLE TRIGGER trg_group_members_audit;

COMMIT;
