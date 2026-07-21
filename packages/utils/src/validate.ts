import { z } from 'zod';
import { UK_POSTCODE_RE } from './format';

export const ukPhoneE164 = z.string().regex(/^\+447\d{9}$/);
export const inPhoneE164 = z.string().regex(/^\+91[6-9]\d{9}$/);
export const emailSchema = z.string().email();
export const ukPostcodeSchema = z.string().regex(UK_POSTCODE_RE);

/** Normalise a UK or Indian mobile number to E.164. */
export function normaliseMobile(input: string): string | null {
  const digits = input.replace(/[\s\-()]/g, '');
  if (ukPhoneE164.safeParse(digits).success || inPhoneE164.safeParse(digits).success) return digits;
  if (/^447\d{9}$/.test(digits)) return `+${digits}`;
  if (/^07\d{9}$/.test(digits)) return `+44${digits.slice(1)}`;
  if (/^91[6-9]\d{9}$/.test(digits)) return `+${digits}`;
  return null;
}
