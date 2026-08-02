import { Badge } from '@urban-assist/ui';
import { bookingStatusLabel, bookingStatusTone } from '../lib/booking-status';

export function StatusPill({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <Badge tone={bookingStatusTone(status)} className={className}>
      {bookingStatusLabel(status)}
    </Badge>
  );
}
