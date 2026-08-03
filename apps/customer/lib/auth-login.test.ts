import { describe, expect, it } from 'vitest';
import {
  PROFESSIONAL_ACCOUNT_MESSAGE,
  getCustomerSignInError,
  isCustomerRoleAllowed,
} from './auth-login';

describe('customer auth boundary', () => {
  it('blocks every existing non-customer role', () => {
    expect(isCustomerRoleAllowed('customer')).toBe(true);
    expect(isCustomerRoleAllowed('provider')).toBe(false);
    expect(isCustomerRoleAllowed('admin')).toBe(false);
    expect(isCustomerRoleAllowed(null)).toBe(true);
  });

  // Phone-format matching moved into SQL: role_for_phone() strips non-digits
  // and matches auth.users.phone (digits-only). Covered by the live probe in
  // 202608030012 verification, not a JS helper.

  it('maps wrong-app responses to customer-safe copy', () => {
    expect(getCustomerSignInError('wrong_app', 403)).toBe(PROFESSIONAL_ACCOUNT_MESSAGE);
  });

  it('never exposes SMS provider details', () => {
    expect(
      getCustomerSignInError(
        'Twilio trial accounts can only send messages to verified numbers. Configure a confirmation OTP.',
        400,
      ),
    ).toBe("We couldn't send a code to this number. Check it and try again.");
  });

  it('uses stable rate-limit and generic messages', () => {
    expect(getCustomerSignInError('internal limiter detail', 429)).toBe(
      'Too many attempts. Wait a few minutes and try again.',
    );
    expect(getCustomerSignInError('private upstream detail', 500)).toBe(
      "We couldn't complete sign-in. Please try again.",
    );
  });
});
