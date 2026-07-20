const SUPABASE_URL = 'https://xouanfmyieodnqmmkuxi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvdWFuZm15aWVvZG5xbW1rdXhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzMyODUyNiwiZXhwIjoyMDk4OTA0NTI2fQ._4z3ofPyN6-01jROMgkjq_VBk3TKgTjL8MVEruECHvM';

const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

async function seedAdmin() {
  const email = 'urbanassistuk@gmail.com';
  const password = 'Admin@1234';

  console.log(`Setting up Admin user: ${email}...`);

  // 1. Try creating admin user in Auth
  let userId = null;
  const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'admin', full_name: 'Urban Assist Admin' },
    }),
  });

  if (createRes.ok) {
    const data = await createRes.json();
    userId = data.id;
    console.log(`Created new admin user with ID: ${userId}`);
  } else {
    // 2. User exists, fetch list to find ID
    console.log('User already exists. Updating password & confirming email...');
    const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'GET',
      headers,
    });
    const listData = await listRes.json();
    const existing = (listData.users || []).find((u) => u.email === email);

    if (!existing) {
      console.error('Failed to list or find user:', listData);
      process.exit(1);
    }

    userId = existing.id;
    const updateRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        password,
        email_confirm: true,
        user_metadata: { role: 'admin', full_name: 'Urban Assist Admin' },
      }),
    });

    if (!updateRes.ok) {
      const err = await updateRes.text();
      console.error('Failed to update user:', err);
      process.exit(1);
    }
    console.log(`Updated existing user password for ID: ${userId}`);
  }

  // 3. Upsert profile with admin role
  const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?on_conflict=id`, {
    method: 'POST',
    headers: {
      ...headers,
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      id: userId,
      email,
      full_name: 'Urban Assist Admin',
      role: 'admin',
    }),
  });

  if (!profileRes.ok) {
    const errText = await profileRes.text();
    console.error('Profile upsert warning:', errText);
  } else {
    console.log('Successfully set user role to "admin" in profiles table.');
  }

  // 4. Upsert admin permissions
  const permRes = await fetch(`${SUPABASE_URL}/rest/v1/admin_permissions?on_conflict=profile_id`, {
    method: 'POST',
    headers: {
      ...headers,
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      profile_id: userId,
      can_manage_admins: true,
      can_manage_bookings: true,
      can_manage_providers: true,
      can_manage_users: true,
      can_manage_kyc: true,
      can_manage_tickets: true,
      can_manage_payments: true,
      can_manage_promo_codes: true,
      can_view_audit_log: true,
    }),
  });

  if (!permRes.ok) {
    const permErr = await permRes.text();
    console.error('Admin permissions upsert warning:', permErr);
  } else {
    console.log('Successfully granted all super-admin permissions.');
  }

  console.log('\n======================================================');
  console.log('SUCCESS! Admin account ready for login at localhost:3002');
  console.log(`Email:    ${email}`);
  console.log(`Password: ${password}`);
  console.log('======================================================\n');
}

seedAdmin().catch(console.error);
