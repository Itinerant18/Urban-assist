import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@urban-assist/db/server';
import { loadJobs, loadOfferedBookingIds } from '../../../lib/provider-data';
import { JobsList } from './jobs-list';

export const dynamic = 'force-dynamic';

export default async function JobsPage() {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');

  const [jobs, offered] = await Promise.all([
    loadJobs(db, user.id),
    loadOfferedBookingIds(db, user.id),
  ]);

  // A Set cannot cross the server/client boundary; flag each row instead.
  const withOrigin = jobs.map((j: any) => ({
    ...j,
    admin_assigned: !offered.has(j.id),
  }));

  return <JobsList jobs={withOrigin} />;
}
