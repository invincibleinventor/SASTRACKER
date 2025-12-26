DROP POLICY IF EXISTS "Only admins can view admin_users" ON admin_users;
DROP POLICY IF EXISTS "Users can check if they are admin" ON admin_users;
DROP POLICY IF EXISTS "Admins can manage admin_users" ON admin_users;

CREATE POLICY "Anyone can read admin_users" ON admin_users
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert admin_users" ON admin_users
  FOR INSERT WITH CHECK (
    lower(email) IN (SELECT lower(email) FROM admin_users)
  );

CREATE POLICY "Admins can update admin_users" ON admin_users
  FOR UPDATE USING (
    lower(auth.jwt() ->> 'email') IN (SELECT lower(email) FROM admin_users)
  );

CREATE POLICY "Admins can delete admin_users" ON admin_users
  FOR DELETE USING (
    lower(auth.jwt() ->> 'email') IN (SELECT lower(email) FROM admin_users)
  );
