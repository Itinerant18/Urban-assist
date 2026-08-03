import { KeyRound } from 'lucide-react';

import { PageHeader, BentoTile } from '@/components/bento';
import { PasswordChangeForm } from './password-form';

export const dynamic = 'force-dynamic';

export default function AccountSettingsPage() {
  return (
    <div>
      <PageHeader
        title="Account"
        subtitle="Change your admin sign-in password. MFA stays enrolled on this account."
        action={<KeyRound className="h-5 w-5 text-muted" aria-hidden />}
      />

      <BentoTile static className="!justify-start">
        <p className="mb-4 text-sm font-semibold text-ink">Password</p>
        <p className="mb-4 text-xs text-muted">
          Use at least 12 characters. You’ll need your current password to confirm the change.
        </p>
        <PasswordChangeForm />
      </BentoTile>
    </div>
  );
}
