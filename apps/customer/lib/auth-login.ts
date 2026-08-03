export const PROFESSIONAL_ACCOUNT_MESSAGE =
  'This account is registered as a professional. Use the provider app, or sign in with a different number.';

const SMS_PROVIDER_ERROR = /twilio|unverified|confirmation\s*otp/i;
const INVALID_OTP_ERROR = /invalid.*(?:otp|token)|(?:otp|token).*(?:invalid|expired)/i;

export function isCustomerRoleAllowed(role: string | null | undefined): boolean {
  return !role || role === 'customer';
}

export function getCustomerSignInError(reason: unknown, status?: number): string {
  const message = typeof reason === 'string' ? reason : '';

  if (message === 'wrong_app') return PROFESSIONAL_ACCOUNT_MESSAGE;
  if (status === 429) return 'Too many attempts. Wait a few minutes and try again.';
  if (SMS_PROVIDER_ERROR.test(message)) {
    return "We couldn't send a code to this number. Check it and try again.";
  }
  if (INVALID_OTP_ERROR.test(message)) {
    return 'That code is invalid or has expired. Check it and try again.';
  }

  return "We couldn't complete sign-in. Please try again.";
}
