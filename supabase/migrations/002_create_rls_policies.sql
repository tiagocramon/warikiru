-- Enable RLS on all tables
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION is_group_member(gid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = gid
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_group_owner(gid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM groups
    WHERE id = gid AND owner_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- GROUPS POLICIES
-- ============================================
CREATE POLICY "Members can view group"
  ON groups FOR SELECT
  USING (is_group_member(id) OR owner_id = auth.uid());

CREATE POLICY "Authenticated users can create groups"
  ON groups FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owner can update group"
  ON groups FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Owner can delete group"
  ON groups FOR DELETE
  USING (owner_id = auth.uid());

-- ============================================
-- GROUP_MEMBERS POLICIES
-- ============================================
CREATE POLICY "Members can view group members"
  ON group_members FOR SELECT
  USING (is_group_member(group_id) OR is_group_owner(group_id));

CREATE POLICY "Owner can add members"
  ON group_members FOR INSERT
  WITH CHECK (is_group_owner(group_id));

CREATE POLICY "Owner can update members"
  ON group_members FOR UPDATE
  USING (is_group_owner(group_id));

CREATE POLICY "Owner can remove members"
  ON group_members FOR DELETE
  USING (is_group_owner(group_id));

-- ============================================
-- EXPENSES POLICIES
-- ============================================
CREATE POLICY "Members can view expenses"
  ON expenses FOR SELECT
  USING (is_group_member(group_id));

CREATE POLICY "Members can create expenses"
  ON expenses FOR INSERT
  WITH CHECK (
    is_group_member(group_id)
    AND created_by_user_id = auth.uid()
  );

CREATE POLICY "Author can update own expense"
  ON expenses FOR UPDATE
  USING (created_by_user_id = auth.uid());

CREATE POLICY "Author or owner can delete expense"
  ON expenses FOR DELETE
  USING (
    created_by_user_id = auth.uid()
    OR is_group_owner(group_id)
  );

-- ============================================
-- PAYMENTS POLICIES
-- ============================================
CREATE POLICY "Members can view payments"
  ON payments FOR SELECT
  USING (is_group_member(group_id));

CREATE POLICY "Members can create payments"
  ON payments FOR INSERT
  WITH CHECK (
    is_group_member(group_id)
    AND (from_user_id = auth.uid() OR to_user_id = auth.uid())
  );

-- ============================================
-- AUDIT_LOGS POLICIES
-- ============================================
CREATE POLICY "Members can view audit log"
  ON audit_logs FOR SELECT
  USING (is_group_member(group_id));

-- INSERT via trigger only (SECURITY DEFINER function)
