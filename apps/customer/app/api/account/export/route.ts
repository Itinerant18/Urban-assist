import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@urban-assist/db/server';
import { exportUserData } from '@urban-assist/domain';

export const dynamic = 'force-dynamic';

export async function POST() {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const data = await exportUserData(db, user.id);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="urban-assist-data-${user.id}.json"`,
    },
  });
}
