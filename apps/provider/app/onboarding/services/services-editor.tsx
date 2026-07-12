'use client';
import * as React from 'react';
import { Button, Card, Field, Input, Badge } from '@urban-assist/ui';
import { pence } from '@urban-assist/lib';
import { getSupabaseBrowser as supabase } from '@urban-assist/db/browser';
import { Plus, Trash2, Edit2, Check, X, ToggleLeft, ToggleRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Category {
  id: string;
  slug: string;
  name: string;
  min_price_pence: number;
  max_price_pence: number;
}

interface ProviderService {
  id: string;
  category_id: string;
  title: string;
  price_pence: number;
  duration_mins: number;
  is_active: boolean;
}

export function ServicesEditor({
  categories,
  mine: initialMine,
}: {
  categories: Category[];
  mine: ProviderService[];
}) {
  const router = useRouter();
  const [mine, setMine] = React.useState<ProviderService[]>(initialMine);
  const [adding, setAdding] = React.useState(false);
  
  // Form state for adding new service
  const [selectedCatId, setSelectedCatId] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [priceGbp, setPriceGbp] = React.useState('');
  const [duration, setDuration] = React.useState('60');
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  // Edit state for inline editing
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editPriceGbp, setEditPriceGbp] = React.useState('');
  const [editDuration, setEditDuration] = React.useState('');
  const [editTitle, setEditTitle] = React.useState('');
  const [editError, setEditError] = React.useState<string | null>(null);

  // Filter categories to only those not already added
  const availableCategories = categories.filter(
    (c) => !mine.some((m) => m.category_id === c.id)
  );

  React.useEffect(() => {
    if (availableCategories.length > 0 && !selectedCatId) {
      setSelectedCatId(availableCategories[0].id);
      setTitle(availableCategories[0].name);
    }
  }, [availableCategories, selectedCatId]);

  const selectedCategory = categories.find((c) => c.id === selectedCatId);

  async function addService(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      if (!selectedCategory) throw new Error('Select a category');
      const pricePence = Math.round(parseFloat(priceGbp) * 100);
      if (isNaN(pricePence)) throw new Error('Enter a valid price');
      
      if (pricePence < selectedCategory.min_price_pence || pricePence > selectedCategory.max_price_pence) {
        throw new Error(
          `Price must be between ${pence(selectedCategory.min_price_pence)} and ${pence(
            selectedCategory.max_price_pence
          )}`
        );
      }

      const sb = supabase();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) throw new Error('Sign in required');

      const { data, error: insertErr } = await sb
        .from('provider_services')
        .insert({
          provider_id: user.id,
          category_id: selectedCatId,
          title: title.trim() || selectedCategory.name,
          price_pence: pricePence,
          duration_mins: parseInt(duration) || 60,
          is_active: true,
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      setMine([...mine, data]);
      setAdding(false);
      setPriceGbp('');
      setDuration('60');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(service: ProviderService) {
    try {
      const nextActive = !service.is_active;
      const sb = supabase();
      const { error } = await sb
        .from('provider_services')
        .update({ is_active: nextActive })
        .eq('id', service.id);

      if (error) throw error;
      setMine(mine.map((m) => (m.id === service.id ? { ...m, is_active: nextActive } : m)));
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function deleteService(id: string) {
    if (!confirm('Are you sure you want to remove this service?')) return;
    try {
      const sb = supabase();
      const { error } = await sb.from('provider_services').delete().eq('id', id);
      if (error) throw error;
      setMine(mine.filter((m) => m.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  }

  function startEdit(service: ProviderService) {
    setEditingId(service.id);
    setEditTitle(service.title);
    setEditPriceGbp((service.price_pence / 100).toFixed(2));
    setEditDuration(service.duration_mins.toString());
    setEditError(null);
  }

  async function saveEdit(service: ProviderService) {
    setEditError(null);
    const cat = categories.find((c) => c.id === service.category_id);
    if (!cat) return;

    try {
      const pricePence = Math.round(parseFloat(editPriceGbp) * 100);
      if (isNaN(pricePence)) throw new Error('Enter a valid price');

      if (pricePence < cat.min_price_pence || pricePence > cat.max_price_pence) {
        throw new Error(
          `Price must be between ${pence(cat.min_price_pence)} and ${pence(cat.max_price_pence)}`
        );
      }

      const sb = supabase();
      const { error } = await sb
        .from('provider_services')
        .update({
          title: editTitle.trim() || cat.name,
          price_pence: pricePence,
          duration_mins: parseInt(editDuration) || 60,
        })
        .eq('id', service.id);

      if (error) throw error;

      setMine(
        mine.map((m) =>
          m.id === service.id
            ? {
                ...m,
                title: editTitle.trim() || cat.name,
                price_pence: pricePence,
                duration_mins: parseInt(editDuration) || 60,
              }
            : m
        )
      );
      setEditingId(null);
    } catch (err: any) {
      setEditError(err.message);
    }
  }

  return (
    <div className="space-y-4">
      {mine.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-mono-utility text-xs text-muted">Your services</h2>
          <ul className="space-y-2">
            {mine.map((m) => {
              const cat = categories.find((c) => c.id === m.category_id);
              const isEditing = editingId === m.id;

              return (
                <li key={m.id}>
                  <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {isEditing ? (
                      <div className="flex-1 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <Field label="Service title">
                            <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                          </Field>
                          <Field label="Price (£)">
                            <Input
                              type="number"
                              step="0.01"
                              value={editPriceGbp}
                              onChange={(e) => setEditPriceGbp(e.target.value)}
                            />
                          </Field>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Field label="Duration (mins)">
                            <Input
                              type="number"
                              value={editDuration}
                              onChange={(e) => setEditDuration(e.target.value)}
                            />
                          </Field>
                          <div className="flex items-end gap-2">
                            <Button size="sm" onClick={() => saveEdit(m)}>
                              <Check className="h-4 w-4" /> Save
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                              <X className="h-4 w-4" /> Cancel
                            </Button>
                          </div>
                        </div>
                        {editError && <p className="text-xs text-danger">{editError}</p>}
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{m.title}</span>
                            <Badge tone={m.is_active ? 'success' : 'muted'}>
                              {m.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted mt-0.5">
                            Category: {cat?.name} · Avg Duration: {m.duration_mins} mins
                          </p>
                        </div>
                        <div className="flex items-center justify-between gap-4 sm:justify-end">
                          <div className="font-display text-lg">{pence(m.price_pence)}</div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => toggleActive(m)}
                              className="tap p-1.5 text-muted hover:text-ink"
                              aria-label={m.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {m.is_active ? (
                                <ToggleRight className="h-5 w-5 text-success" />
                              ) : (
                                <ToggleLeft className="h-5 w-5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => startEdit(m)}
                              className="tap p-1.5 text-muted hover:text-ink"
                              aria-label="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteService(m.id)}
                              className="tap p-1.5 text-danger hover:brightness-90"
                              aria-label="Remove"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {adding ? (
        <Card className="!p-5 space-y-4">
          <form onSubmit={addService} className="space-y-4">
            <h3 className="font-display text-sm font-semibold text-ink">Add a new service</h3>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Category">
                <select
                  value={selectedCatId}
                  onChange={(e) => {
                    setSelectedCatId(e.target.value);
                    const cat = categories.find((c) => c.id === e.target.value);
                    if (cat) setTitle(cat.name);
                  }}
                  className="tap w-full rounded-xl border border-input-border bg-white px-3.5 py-2.5 text-sm text-charcoal focus:border-ink focus:outline-none"
                >
                  {availableCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Service title">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Field
                label="Price (£)"
                hint={
                  selectedCategory
                    ? `Bounds: ${pence(selectedCategory.min_price_pence)} - ${pence(
                        selectedCategory.max_price_pence
                      )}`
                    : undefined
                }
              >
                <Input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 35.00"
                  value={priceGbp}
                  onChange={(e) => setPriceGbp(e.target.value)}
                />
              </Field>
              <Field label="Avg duration (mins)">
                <Input
                  type="number"
                  required
                  placeholder="e.g. 60"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </Field>
            </div>

            {error && <p className="text-xs text-danger">{error}</p>}
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={busy} className="flex-1">
                {busy ? 'Adding…' : 'Add service'}
              </Button>
              <Button type="button" variant="outline" className="flex-1" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        availableCategories.length > 0 && (
          <Button variant="outline" className="w-full flex items-center justify-center gap-2" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Add a service
          </Button>
        )
      )}

      {mine.length > 0 && !adding && (
        <Button className="w-full mt-4" size="lg" onClick={() => router.push('/')}>
          Finish & open dashboard
        </Button>
      )}
    </div>
  );
}

