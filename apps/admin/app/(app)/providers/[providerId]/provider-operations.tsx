'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';

type Category = { id: string; name: string };
type ServiceArea = { id?: string; category_id: string | null; postcode_pattern: string };

export function ProviderOperations({
  providerId,
  isBlocked,
  categories,
  selectedCategoryIds,
  initialServiceAreas,
  canAddNotes,
}: {
  providerId: string;
  isBlocked: boolean;
  categories: Category[];
  selectedCategoryIds: string[];
  initialServiceAreas: ServiceArea[];
  canAddNotes: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState('');
  const [note, setNote] = React.useState('');
  const [categoryIds, setCategoryIds] = React.useState(selectedCategoryIds);
  const [serviceAreas, setServiceAreas] = React.useState<ServiceArea[]>(initialServiceAreas);

  async function mutate(body: Record<string, unknown>, operation: string) {
    setBusy(operation);
    setError(null);
    try {
      const response = await fetch(`/api/providers/${providerId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Provider update failed');
      router.refresh();
      return true;
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : 'Provider update failed');
      return false;
    } finally {
      setBusy(null);
    }
  }

  function toggleCategory(categoryId: string) {
    setCategoryIds((current) => {
      if (current.includes(categoryId)) {
        setServiceAreas((areas) => areas.filter((area) => area.category_id !== categoryId));
        return current.filter((id) => id !== categoryId);
      }
      return [...current, categoryId];
    });
  }

  function updateArea(index: number, patch: Partial<ServiceArea>) {
    setServiceAreas((current) => current.map((area, areaIndex) =>
      areaIndex === index ? { ...area, ...patch } : area,
    ));
  }

  return (
    <div className="space-y-6">
      {error && <div className="rounded-xl border border-danger/20 bg-danger/5 p-3 text-xs font-semibold text-danger">{error}</div>}

      <section className="card space-y-4">
        <div>
          <h2 className="font-display text-base font-bold text-ink">Assignment eligibility</h2>
          <p className="mt-1 text-xs text-muted">Active categories and postcode prefixes feed the manual assignment strategy.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {categories.map((category) => (
            <label key={category.id} className="flex items-center gap-2 rounded-lg border border-hairline bg-white px-3 py-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={categoryIds.includes(category.id)}
                onChange={() => toggleCategory(category.id)}
                className="h-4 w-4 rounded border-hairline text-accent focus:ring-accent"
              />
              {category.name}
            </label>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted">Service areas</h3>
            <button
              type="button"
              className="btn-secondary inline-flex items-center gap-1"
              onClick={() => setServiceAreas((current) => [...current, { category_id: null, postcode_pattern: '' }])}
            >
              <Plus className="h-3.5 w-3.5" /> Add area
            </button>
          </div>
          {serviceAreas.length === 0 && <p className="rounded-lg bg-bg/50 p-3 text-xs text-muted">No coverage configured; this provider will not appear as eligible.</p>}
          {serviceAreas.map((area, index) => (
            <div key={area.id ?? index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <select
                className="input"
                value={area.category_id ?? ''}
                onChange={(event) => updateArea(index, { category_id: event.target.value || null })}
              >
                <option value="">All active categories</option>
                {categories.filter((category) => categoryIds.includes(category.id)).map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
              <input
                className="input uppercase"
                value={area.postcode_pattern}
                maxLength={8}
                placeholder="SW1"
                onChange={(event) => updateArea(index, { postcode_pattern: event.target.value.toUpperCase() })}
              />
              <button
                type="button"
                aria-label="Remove service area"
                className="tap rounded-lg border border-hairline p-2 text-muted hover:text-danger"
                onClick={() => setServiceAreas((current) => current.filter((_, areaIndex) => areaIndex !== index))}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          className="btn-primary"
          disabled={busy !== null || serviceAreas.some((area) => area.postcode_pattern.replace(/\s/g, '').length < 2)}
          onClick={() => void mutate({
            action: 'configure',
            categoryIds,
            serviceAreas: serviceAreas.map((area) => ({
              categoryId: area.category_id,
              postcodePattern: area.postcode_pattern,
            })),
          }, 'configure')}
        >
          {busy === 'configure' ? 'Saving…' : 'Save eligibility'}
        </button>
      </section>

      {canAddNotes && (
        <section className="card space-y-3">
          <div><h2 className="font-display text-base font-bold text-ink">Internal note</h2><p className="text-xs text-muted">Visible only to authorized admin staff.</p></div>
          <textarea className="input min-h-24 w-full" value={note} maxLength={4000} onChange={(event) => setNote(event.target.value)} placeholder="Add operational or support context…" />
          <button
            className="btn-secondary"
            disabled={busy !== null || !note.trim()}
            onClick={async () => {
              if (await mutate({ action: 'note', note }, 'note')) setNote('');
            }}
          >
            {busy === 'note' ? 'Adding…' : 'Add note'}
          </button>
        </section>
      )}

      <section className="card space-y-3 border-danger/20">
        <div><h2 className="font-display text-base font-bold text-ink">Provider access</h2><p className="text-xs text-muted">Blocked providers are immediately excluded from assignment.</p></div>
        <textarea className="input min-h-20 w-full" value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} placeholder={isBlocked ? 'Optional unblock reason' : 'Required blocking reason'} />
        <button
          className={isBlocked ? 'btn-secondary' : 'rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white'}
          disabled={busy !== null || (!isBlocked && reason.trim().length < 3)}
          onClick={() => void mutate({ action: isBlocked ? 'unblock' : 'block', reason }, 'block')}
        >
          {busy === 'block' ? 'Updating…' : isBlocked ? 'Unblock provider' : 'Block provider'}
        </button>
      </section>
    </div>
  );
}
