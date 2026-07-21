export type AssignmentStrategyCode = 'manual_admin' | 'ml_recommendation';

export interface AssignmentCandidate {
  provider_id: string;
  full_name: string | null;
  email: string | null;
  rating: number;
  completed_jobs: number;
  cancellation_rate: number;
  last_seen_at: string | null;
  earnings_pence: number;
  is_available: boolean;
}

export interface AssignmentCommand {
  bookingId: string;
  providerId: string;
  reason?: string;
  generateOtp?: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AssignmentResult {
  booking_id: string;
  customer_id: string;
  provider_id: string;
  previous_provider_id: string | null;
  status: 'assigned';
  action_type: 'ASSIGN_PROVIDER' | 'REASSIGN_PROVIDER';
  strategy: AssignmentStrategyCode;
  otp_generated: boolean;
  firebase_outbox_id: string;
  firebase_status_event_id: string | null;
  provider_push_deliveries: number;
}

interface DatabaseClient {
  rpc(name: string, args: Record<string, unknown>): Promise<{
    data: unknown;
    error: { message: string } | null;
  }>;
}

interface StatusSync {
  (event: {
    booking_id: string;
    customer_id: string;
    provider_id: string;
    status: 'assigned';
    actor_id: string;
    actor_role: 'admin';
    source: 'admin';
  }, eventId?: string): Promise<string | null>;
}

interface ProviderNotifier {
  (result: Omit<AssignmentResult, 'firebase_status_event_id' | 'provider_push_deliveries'>):
    Promise<number>;
}

export interface AssignmentStrategy {
  readonly code: AssignmentStrategyCode;
  candidates(db: DatabaseClient, bookingId: string): Promise<AssignmentCandidate[]>;
}

export class ManualAdminAssignmentStrategy implements AssignmentStrategy {
  readonly code = 'manual_admin' as const;

  async candidates(db: DatabaseClient, bookingId: string) {
    const { data, error } = await db.rpc('get_assignment_candidates', {
      p_booking_id: bookingId,
    });
    if (error) throw new Error(error.message);
    return (data ?? []) as AssignmentCandidate[];
  }
}

export function resolveAssignmentStrategy(
  code: AssignmentStrategyCode = 'manual_admin',
): AssignmentStrategy {
  switch (code) {
    case 'manual_admin':
      return new ManualAdminAssignmentStrategy();
    case 'ml_recommendation':
      throw new Error('ml_recommendation_not_configured');
  }
}

export class AssignmentEngine {
  constructor(
    private readonly db: DatabaseClient,
    private readonly actor: { id: string; roles: string[] },
    private readonly strategy: AssignmentStrategy,
    private readonly syncStatus: StatusSync,
    private readonly notifyProvider: ProviderNotifier = async () => 0,
  ) {}

  getCandidates(bookingId: string) {
    return this.strategy.candidates(this.db, bookingId);
  }

  async assign(command: AssignmentCommand): Promise<AssignmentResult> {
    const { data, error } = await this.db.rpc('admin_assign_booking', {
      p_booking_id: command.bookingId,
      p_provider_id: command.providerId,
      p_actor_user_id: this.actor.id,
      p_strategy: this.strategy.code,
      p_reason: command.reason ?? null,
      p_generate_otp: command.generateOtp ?? true,
      p_ip_address: command.ipAddress ?? null,
      p_user_agent: command.userAgent ?? null,
    });
    if (error) throw new Error(error.message);

    const result = data as Omit<
      AssignmentResult,
      'firebase_status_event_id' | 'provider_push_deliveries'
    >;

    // The database assignment is already committed. External delivery failures
    // must not turn a successful assignment into a client-visible mutation error.
    const [statusResult, pushResult] = await Promise.allSettled([
      this.syncStatus({
        booking_id: result.booking_id,
        customer_id: result.customer_id,
        provider_id: result.provider_id,
        status: result.status,
        actor_id: this.actor.id,
        actor_role: 'admin',
        source: 'admin',
      }, result.firebase_outbox_id),
      this.notifyProvider(result),
    ]);

    const firebaseEventId =
      statusResult.status === 'fulfilled' ? statusResult.value : null;
    await this.db.rpc('record_booking_status_sync', {
      p_outbox_id: result.firebase_outbox_id,
      p_actor_user_id: this.actor.id,
      p_external_event_id: firebaseEventId,
      p_error: firebaseEventId ? null : 'firebase_status_sync_failed',
    });

    return {
      ...result,
      firebase_status_event_id: firebaseEventId,
      provider_push_deliveries:
        pushResult.status === 'fulfilled' ? pushResult.value : 0,
    };
  }
}
