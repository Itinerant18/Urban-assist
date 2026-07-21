import { NextResponse } from 'next/server';
import { requireAdminRole } from '../../../../lib/admin-auth';
import { listAdminBookings, readBookingFilters } from '../../../../lib/admin-bookings';
import { getRequestContext } from '../../../../lib/request-context';

export const dynamic = 'force-dynamic';

function csvCell(value: unknown) {
  let text = value == null ? '' : String(value);
  if (/^[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}

export async function GET(request: Request) {
  try {
    const { db, user, roles } = await requireAdminRole([
      'super_admin',
      'ops_admin',
      'finance_admin',
      'analyst',
    ]);
    const values = Object.fromEntries(new URL(request.url).searchParams.entries());
    const filters = readBookingFilters(values);
    const { bookings } = await listAdminBookings(db as any, filters, 10_000);
    const requestContext = getRequestContext(request);
    const rows = [
      [
        'booking_id',
        'short_code',
        'status',
        'scheduled_at',
        'category',
        'postcode',
        'customer',
        'customer_email',
        'provider',
        'total_pence',
      ],
      ...bookings.map((booking) => [
        booking.id,
        booking.short_code,
        booking.status,
        booking.scheduled_at,
        booking.category_name,
        booking.postcode,
        booking.customer_name,
        booking.customer_email,
        booking.provider_name,
        booking.total_pence,
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');

    await (db as any).rpc('append_admin_action_log', {
      p_actor_user_id: user.id,
      p_actor_role_code: roles[0] ?? null,
      p_action_type: 'EXPORT_BOOKINGS_CSV',
      p_entity_type: 'booking',
      p_context: { filters, row_count: bookings.length },
      p_ip_address: requestContext.ipAddress,
      p_user_agent: requestContext.userAgent,
    });

    return new NextResponse(csv, {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': 'attachment; filename="bookings.csv"',
        'cache-control': 'no-store',
      },
    });
  } catch (error: any) {
    const status = error?.message === 'unauthorized' ? 401 : 403;
    return NextResponse.json({ error: error?.message ?? 'export_failed' }, { status });
  }
}
