BEGIN;

-- Limpa apenas os dados do app, preservando a estrutura do banco.
TRUNCATE TABLE
  audit_logs,
  payments,
  expenses,
  group_members,
  groups
RESTART IDENTITY CASCADE;

COMMIT;
