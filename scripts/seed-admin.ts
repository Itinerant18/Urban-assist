import { createClient } from '@supabase/supabase-js';

const url = 'https://xouanfmyieodnqmmkuxi.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvdWFuZm15aWVvZG5xbW1rdXhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzMyODUyNiwiZXhwIjoyMDk4OTA0NTI2fQ._4z3ofPyN6-01jROMgkjq_VBk3TKgTjL8MVEruECHvM';

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function seedAdmin() {
  const email = 'urbanassistuk@gmail.com';
  const password = 'Admin@1234';

  console.log(`Checking if user ${email} exists...`);
  
  const { data: usersData, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error('List users error:', listErr);
    return;
  }

  let user = usersData.users.find((u) => u.email === email);

  if (user) {
    console.log(`User found (${user.id}). Updating password & confirming email...`);
    const { data: updated, error: updateErr } = await supabase.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: { role: 'admin', full_name: 'Urban Assist Admin' },
    });
    if (updateErr) {
      console.error('Update user error:', updateErr);
      return;
    }
    user = updated.user;
  } else {
    console.log(`User not found. Creating user ${email}...`);
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'admin', full_name: 'Urban Assist Admin' },
    });
    if (createErr) {
      console.error('Create user error:', createErr);
      return;
    }
    user = created.user;
  }

  console.log(`User ID: ${user.id}`);

  const { error: profileErr } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      email: email,
      full_name: 'Urban Assist Admin',
      role: 'admin',
      updated_at: new Date().toISOString(),
    });

  if (profileErr) {
    console.error('Profile upsert error:', profileErr);
  } else {
    console.log('Profile updated to admin role.');
  }

  const { error: permErr } = await supabase
    .from('admin_permissions')
    .upsert({
      profile_id: user.id,
      can_manage_admins: true,
      can_manage_categories: true,
      can_manage_services: true,
      can_manage_providers: true,
      can_manage_bookings: true,
      can_manage_tickets: true,
      can_view_financials: true,
      updated_at: new Date().toISOString(),
    });

  if (permErr) {
    console.error('Admin permissions upsert error:', permErr);
  } else {
    console.log('Admin permissions granted.');
  }

  console.log('SUCCESS: Admin credentials created/updated successfully!');
}

seedAdmin();
