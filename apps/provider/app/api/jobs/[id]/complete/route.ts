import { NextResponse } from 'next/server';
import { createServiceRole, getSupabaseServer } from '@urban-assist/db/server';
import { sendPush } from '@urban-assist/integrations/firebase';

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'completion_failed';
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const {
    data: { user },
  } = await getSupabaseServer().auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const form = await req.formData();
    const notes = String(form.get('notes') ?? '').trim();
    const photo = form.get('photo');
    if (!notes || notes.length > 2000) throw new Error('invalid_completion_notes');
    if (
      photo instanceof File &&
      (photo.size > MAX_PHOTO_BYTES || !ALLOWED_PHOTO_TYPES.has(photo.type))
    ) {
      throw new Error('invalid_completion_photo');
    }

    const admin = createServiceRole();
    const { data: booking } = await admin
      .from('bookings')
      .select('id, customer_id, provider_id, status')
      .eq('id', params.id)
      .single();
    if (!booking) throw new Error('booking_not_found');
    if (booking.provider_id !== user.id) throw new Error('forbidden');
    if (booking.status !== 'in_progress') throw new Error('invalid_status_transition');

    let storagePath: string | null = null;
    if (photo instanceof File && photo.size > 0) {
      const extension =
        photo.type === 'image/png' ? 'png' : photo.type === 'image/webp' ? 'webp' : 'jpg';
      storagePath = `${booking.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await admin.storage
        .from('completion-photos')
        .upload(storagePath, photo, { contentType: photo.type, upsert: false });
      if (uploadError) throw uploadError;
    }

    const completionReport = JSON.stringify({ notes, storage_path: storagePath });
    const { data: completed, error: completionError } = await admin
      .from('bookings')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completion_report: completionReport,
      })
      .eq('id', booking.id)
      .eq('provider_id', user.id)
      .eq('status', 'in_progress')
      .select()
      .single();
    if (completionError || !completed) {
      if (storagePath) await admin.storage.from('completion-photos').remove([storagePath]);
      throw new Error('completion_conflict');
    }

    await sendPush(admin, booking.customer_id, {
      title: 'Job completed',
      body: 'Your booking is complete. Tap to rate your experience.',
      data: { booking_id: booking.id, link: `/bookings/${booking.id}` },
    }).catch(() => undefined);

    return NextResponse.json(completed);
  } catch (error: unknown) {
    const message = errorMessage(error);
    const status = message === 'forbidden' ? 403 : message === 'booking_not_found' ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
