import type { Database } from './types/generated';

type PublicTables = Database['public']['Tables'];
type PublicEnums = Database['public']['Enums'];

export type UserRole = PublicEnums['user_role'];
export type BookingStatus = PublicEnums['booking_status'];
export type OfferStatus = PublicEnums['offer_status'];
export type PaymentMethod = PublicEnums['payment_method'];
export type PaymentStatus = PublicEnums['payment_status'];
export type KycStatus = PublicEnums['kyc_status'];
export type ReviewDirection = PublicEnums['review_direction'];
export type TicketStatus = PublicEnums['ticket_status'];

export type Profile = PublicTables['profiles']['Row'];
export type Address = PublicTables['addresses']['Row'];
export type ServiceCategory = PublicTables['service_categories']['Row'];
export type ProviderService = PublicTables['provider_services']['Row'];
export type Booking = PublicTables['bookings']['Row'];
export type BookingOffer = PublicTables['booking_offers']['Row'];
export type Payment = PublicTables['payments']['Row'];
export type Review = PublicTables['reviews']['Row'];
export type Message = PublicTables['messages']['Row'];
export type SupportTicket = PublicTables['support_tickets']['Row'];
export type ProviderDocument = PublicTables['provider_documents']['Row'];
