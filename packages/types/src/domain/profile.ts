export type UserRole = 'customer' | 'provider' | 'admin';
export type KycStatus = 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  kyc_status: KycStatus;
  rating_avg: number;
  rating_count: number;
  acceptance_rate: number;
  is_online: boolean;
  last_seen_at: string | null;
  stripe_account_id: string | null;
  created_at: string;
}
