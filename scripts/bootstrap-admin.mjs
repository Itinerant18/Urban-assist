import { createClient } from '@supabase/supabase-js';

function readArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === '--email' || key === '--password' || key === '--name') {
      args[key.slice(2)] = argv[index + 1];
      index += 1;
    } else if (key === '--reset-mfa') {
      args.resetMfa = true;
    }
  }
  return args;
}

async function findUserByEmail(admin, email) {
  const perPage = 1000;
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.listUsers({ page, perPage });
    if (error) throw error;

    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email);
    if (user || data.users.length < perPage) return user ?? null;
  }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const { email: rawEmail, password, name: rawName, resetMfa } = readArgs(process.argv.slice(2));
  const email = rawEmail?.trim().toLowerCase();
  const name = rawName?.trim();

  if (!url || !serviceRoleKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  }
  if (!email || !password || !name) {
    throw new Error(
      'Usage: pnpm bootstrap:admin -- --email <email> --password <password> --name <name> [--reset-mfa]',
    );
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let user = await findUserByEmail(supabase.auth.admin, email);
  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });
    if (error) throw error;
    user = data.user;
  }

  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      email,
      full_name: name,
      role: 'admin',
    },
    { onConflict: 'id' },
  );
  if (profileError) throw profileError;

  const { data: role, error: roleError } = await supabase
    .from('admin_roles')
    .select('id')
    .eq('code', 'super_admin')
    .single();
  if (roleError) throw roleError;

  const { error: membershipError } = await supabase.from('admin_user_roles').upsert(
    {
      user_id: user.id,
      role_id: role.id,
      created_by: user.id,
    },
    { onConflict: 'user_id,role_id' },
  );
  if (membershipError) throw membershipError;

  // Recovery path for a lost authenticator: the login route only clears
  // unverified factors, so a verified TOTP factor locks the admin out forever.
  if (resetMfa) {
    const { data: factorData, error: listError } = await supabase.auth.admin.mfa.listFactors({
      userId: user.id,
    });
    if (listError) throw listError;
    const factors = factorData?.factors ?? [];
    for (const factor of factors) {
      const { error: deleteError } = await supabase.auth.admin.mfa.deleteFactor({
        id: factor.id,
        userId: user.id,
      });
      if (deleteError) throw deleteError;
    }
    console.log(`MFA reset: removed ${factors.length} factor(s); next login re-enrolls TOTP.`);
  }

  console.log(`Super admin ready: ${email} (${user.id})`);
}

main().catch((error) => {
  console.error(`Failed to bootstrap admin: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
