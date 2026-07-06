export type TicketStatus = 'open' | 'in_review' | 'resolved' | 'closed';

export interface SupportTicket {
  id: string;
  booking_id: string | null;
  raised_by: string;
  category: string;
  description: string;
  status: TicketStatus;
  created_at: string;
  resolved_at: string | null;
}
