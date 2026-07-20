export type PayoutReleaseStatus = 'ready' | 'processing' | 'failed' | 'paid';

export interface FinancialMetrics {
  gross_processed_pence: number;
  vat_collected_pence: number;
  platform_revenue_pence: number;
  provider_payable_pence: number;
  pending_pence: number;
  ready_pence: number;
  processing_pence: number;
  paid_pence: number;
  failed_pence: number;
  releasable_pence: number;
}

export interface ProviderPayoutSummary {
  provider_id: string;
  full_name: string;
  stripe_account_id: string | null;
  eligible_booking_count: number;
  provider_payable_pence: number;
  ready_pence: number;
  processing_pence: number;
  paid_pence: number;
  failed_pence: number;
  releasable_pence: number;
  release_status: PayoutReleaseStatus;
  last_failure_reason: string | null;
}

export interface AdminFinancialDashboard {
  metrics: FinancialMetrics;
  providers: ProviderPayoutSummary[];
}

export interface ProviderPayoutReleaseResult {
  released: number;
  processing: number;
  alreadyPaid: number;
}
