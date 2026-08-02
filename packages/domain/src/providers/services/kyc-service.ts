import type { SupabaseClient } from '@supabase/supabase-js';

export async function verifyProviderDocuments(
  db: SupabaseClient,
  admin: SupabaseClient,
  providerId: string,
): Promise<{ success: boolean; status: 'pending' | 'approved' | 'rejected' }> {
  const { data: docs, error } = await db
    .from('provider_documents')
    .select('doc_type, expires_at')
    .eq('provider_id', providerId);

  if (error || !docs) {
    throw error ?? new Error('Documents not found');
  }

  const today = new Date();
  const validTypes = new Set<string>();

  for (const doc of docs) {
    const notExpired = !doc.expires_at || new Date(doc.expires_at) > today;
    if (notExpired) {
      validTypes.add(doc.doc_type);
    }
  }

  const isApproved = validTypes.has('id') && validTypes.has('selfie');

  const newStatus = isApproved ? 'approved' : 'pending';

  const { error: updateErr } = await admin
    .from('profiles')
    .update({ kyc_status: newStatus })
    .eq('id', providerId);

  if (updateErr) {
    throw updateErr;
  }

  return { success: isApproved, status: newStatus as any };
}
