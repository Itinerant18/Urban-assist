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

interface Subcategory {
  id: string;
  category_id: string;
  slug: string;
  name: string;
}

interface SKU {
  id: string;
  subcategory_id: string;
  slug: string;
  name: string;
  min_price_pence: number | null;
  max_price_pence: number | null;
  duration_mins: number | null;
}

interface ProviderService {
  id: string;
  category_id: string;
  sku_id?: string | null;
  title: string;
  price_pence: number;
  duration_mins: number;
  is_active: boolean;
  service_skus?: { id: string; name: string } | null;
}

export function ServicesEditor({
  categories,
  subcategories = [],
  skus = [],
  mine: initialMine,
}: {
  categories: Category[];
  subcategories?: Subcategory[];
  skus?: SKU[];
  mine: ProviderService[];
}) {
  const router = useRouter();
  const [mine, setMine] = React.useState<ProviderService[]>(initialMine);
  const [adding, setAdding] = React.useState(false);

  // Cascading form state for adding new service
  const [selectedCatId, setSelectedCatId] = React.useState('');
  const [selectedSubcatId, setSelectedSubcatId] = React.useState('');
  const [selectedSkuId, setSelectedSkuId] = React.useState('');
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

  // Initialize selected category if empty
  React.useEffect(() => {
    if (categories.length > 0 && !selectedCatId) {
      setSelectedCatId(categories[0].id);
    }
  }, [categories, selectedCatId]);

  // Derived list of subcategories for chosen category
  const filteredSubcats = React.useMemo(() => {
    return subcategories.filter((s) => s.category_id === selectedCatId);
  }, [subcategories, selectedCatId]);

  // When selectedCatId changes, select first subcategory
  React.useEffect(() => {
    if (filteredSubcats.length > 0) {
      if (!filteredSubcats.some((s) => s.id === selectedSubcatId)) {
        setSelectedSubcatId(filteredSubcats[0].id);
      }
    } else {
      setSelectedSubcatId('');
    }
  }, [filteredSubcats, selectedSubcatId]);

  // Derived list of SKUs for chosen subcategory
  const filteredSkus = React.useMemo(() => {
    return skus.filter((k) => k.subcategory_id === selectedSubcatId);
  }, [skus, selectedSubcatId]);

  // When selectedSubcatId changes, select first SKU
  React.useEffect(() => {
    if (filteredSkus.length > 0) {
      if (!filteredSkus.some((k) => k.id === selectedSkuId)) {
        const firstSku = filteredSkus[0];
        setSelectedSkuId(firstSku.id);
        setTitle(firstSku.name);
        if (firstSku.duration_mins) setDuration(String(firstSku.duration_mins));
      }
    } else {
      setSelectedSkuId('');
      const cat = categories.find((c) => c.id === selectedCatId);
      if (cat) setTitle(cat.name);
    }
  }, [filteredSkus, selectedSkuId, categories, selectedCatId]);

  const selectedCategory = categories.find((c) => c.id === selectedCatId);
  const selectedSku = skus.find((k) => k.id === selectedSkuId);

  // Calculate active price bounds (prefer SKU bounds if set, fallback to Category bounds)
  const minPence =
    selectedSku?.min_price_pence && selectedSku.min_price_pence > 0
      ? selectedSku.min_price_pence
      : selectedCategory?.min_price_pence ?? 0;

  const maxPence =
    selectedSku?.max_price_pence && selectedSku.max_price_pence > 0
      ? selectedSku.max_price_pence
      : selectedCategory?.max_price_pence ?? 50000;

  function handleSkuChange(skuId: string) {
    setSelectedSkuId(skuId);
    const sku = skus.find((k) => k.id === skuId);
    if (sku) {
      setTitle(sku.name);
      if (sku.duration_mins) setDuration(String(sku.duration_mins));
    }
  }

  async function addService(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      if (!selectedCategory) throw new Error('Select a category');
      const pricePence = Math.round(parseFloat(priceGbp) * 100);
      if (isNaN(pricePence)) throw new Error('Enter a valid price');

      if (pricePence < minPence || pricePence > maxPence) {
        throw new Error(
          `Price must be between ${pence(minPence)} and ${pence(maxPence)}`
        );
      }

      const sb = supabase();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) throw new Error('Sign in required');

      const { data, error: insertErr } = await sb
        .from('provider_services')
        .insert({
          provider_id: user.id,
          category_id: selectedCatId,
          sku_id: selectedSkuId || null,
          title: title.trim() || selectedSku?.name || selectedCategory.name,
          price_pence: pricePence,
          duration_mins: parseInt(duration) || selectedSku?.duration_mins || 60,
          is_active: true,
        })
        .select('*, service_skus(id, name)')
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
    const sku = service.sku_id ? skus.find((k) => k.id === service.sku_id) : undefined;
    if (!cat) return;

    const editMinPence =
      sku?.min_price_pence && sku.min_price_pence > 0 ? sku.min_price_pence : cat.min_price_pence;
    const editMaxPence =
      sku?.max_price_pence && sku.max_price_pence > 0 ? sku.max_price_pence : cat.max_price_pence;

    try {
      const pricePence = Math.round(parseFloat(editPriceGbp) * 100);
      if (isNaN(pricePence)) throw new Error('Enter a valid price');

      if (pricePence < editMinPence || pricePence > editMaxPence) {
        throw new Error(
          `Price must be between ${pence(editMinPence)} and ${pence(editMaxPence)}`
        );
      }

      const sb = supabase();
      const { error } = await sb
        .from('provider_services')
        .update({
          title: editTitle.trim() || sku?.name || cat.name,
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
                title: editTitle.trim() || sku?.name || cat.name,
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
              const sku = m.sku_id ? skus.find((k) => k.id === m.sku_id) : undefined;
              const skuName = m.service_skus?.name ?? sku?.name;
              const isEditing = editingId === m.id;

              return (
                <li key={m.id}>
                  <Card className="p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium truncate">{m.title}</span>
                            {skuName ? (
                              <Badge tone="accent">{skuName}</Badge>
                            ) : null}
                            <Badge tone={m.is_active ? 'success' : 'muted'}>
                              {m.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted mt-0.5">
                            Category: {cat?.name} · Duration: {m.duration_mins} mins
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
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Field label="Category">
                <select
                  value={selectedCatId}
                  onChange={(e) => setSelectedCatId(e.target.value)}
                  className="tap w-full rounded-xl border border-input-border bg-white px-3.5 py-2.5 text-sm text-charcoal focus:border-ink focus:outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Subcategory">
                <select
                  value={selectedSubcatId}
                  onChange={(e) => setSelectedSubcatId(e.target.value)}
                  className="tap w-full rounded-xl border border-input-border bg-white px-3.5 py-2.5 text-sm text-charcoal focus:border-ink focus:outline-none"
                  disabled={filteredSubcats.length === 0}
                >
                  {filteredSubcats.length === 0 ? (
                    <option value="">No subcategories</option>
                  ) : (
                    filteredSubcats.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))
                  )}
                </select>
              </Field>

              <Field label="Service SKU">
                <select
                  value={selectedSkuId}
                  onChange={(e) => handleSkuChange(e.target.value)}
                  className="tap w-full rounded-xl border border-input-border bg-white px-3.5 py-2.5 text-sm text-charcoal focus:border-ink focus:outline-none"
                  disabled={filteredSkus.length === 0}
                >
                  {filteredSkus.length === 0 ? (
                    <option value="">Custom Service</option>
                  ) : (
                    filteredSkus.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.name}
                      </option>
                    ))
                  )}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Field label="Service title">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </Field>

              <Field
                label="Price (£)"
                hint={`Bounds: ${pence(minPence)} - ${pence(maxPence)}`}
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
        <Button variant="outline" className="w-full flex items-center justify-center gap-2" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" /> Add a service
        </Button>
      )}

      {mine.length > 0 && !adding && (
        <Button className="w-full mt-4" size="lg" onClick={() => router.push('/')}>
          Finish &amp; open dashboard
        </Button>
      )}
    </div>
  );
}


