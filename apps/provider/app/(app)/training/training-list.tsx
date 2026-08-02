'use client';

import * as React from 'react';
import { Card, Badge, EmptyState } from '@urban-assist/ui';
import { ukDate } from '@urban-assist/lib';
import { Check, ExternalLink, PlayCircle, FileText, Users } from 'lucide-react';

interface Item {
  id: string;
  title: string;
  description: string | null;
  content_url: string | null;
  kind: 'video' | 'doc' | 'in_person';
  is_mandatory: boolean;
  category: { name: string } | null;
  completed_at: string | null;
}

const KIND_ICON = {
  video: PlayCircle,
  doc: FileText,
  in_person: Users,
} as const;

const KIND_LABEL = {
  video: 'Video',
  doc: 'Reading',
  in_person: 'In person',
} as const;

export function TrainingList({ items }: { items: Item[] }) {
  const [state, setState] = React.useState<Record<string, string | null>>(() =>
    Object.fromEntries(items.map((i) => [i.id, i.completed_at])),
  );
  const [busy, setBusy] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  async function toggle(id: string) {
    const next = !state[id];
    setBusy(id);
    setErr(null);
    // Optimistic; rolled back below if the write fails.
    setState((s) => ({ ...s, [id]: next ? new Date().toISOString() : null }));
    try {
      const res = await fetch(`/api/training/${id}/complete`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ completed: next }),
      });
      if (!res.ok) throw new Error('Could not save. Try again.');
    } catch (e: any) {
      setState((s) => ({ ...s, [id]: next ? null : new Date().toISOString() }));
      setErr(e.message);
    } finally {
      setBusy(null);
    }
  }

  const mandatory = items.filter((i) => i.is_mandatory);
  const optional = items.filter((i) => !i.is_mandatory);
  const mandatoryDone = mandatory.filter((i) => state[i.id]).length;

  return (
    <div className="space-y-5 py-2">
      <header className="space-y-1">
        <h1 className="font-display text-xl uppercase font-bold text-ink tracking-tight">
          Training
        </h1>
        {mandatory.length > 0 && (
          <p className="text-xs text-muted">
            {mandatoryDone} of {mandatory.length} required completed
          </p>
        )}
      </header>

      {mandatory.length > 0 && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-hairline">
          <div
            className="h-full rounded-full bg-success transition-all duration-500"
            style={{ width: `${(mandatoryDone / mandatory.length) * 100}%` }}
          />
        </div>
      )}

      {err && <p className="text-xs text-danger font-medium">{err}</p>}

      {items.length === 0 ? (
        <EmptyState
          title="No training yet"
          description="Training relevant to the services you offer will appear here."
        />
      ) : (
        <>
          <Section
            title="Required"
            items={mandatory}
            state={state}
            busy={busy}
            onToggle={toggle}
          />
          <Section
            title="Recommended"
            items={optional}
            state={state}
            busy={busy}
            onToggle={toggle}
          />
        </>
      )}

      <p className="text-xs text-muted">
        Ticking an item records that you have completed it. We may ask you to confirm this
        during a quality review.
      </p>
    </div>
  );
}

function Section({
  title,
  items,
  state,
  busy,
  onToggle,
}: {
  title: string;
  items: Item[];
  state: Record<string, string | null>;
  busy: string | null;
  onToggle: (id: string) => void;
}) {
  if (!items.length) return null;

  return (
    <section className="space-y-2">
      <h2 className="font-mono-utility text-[10px] uppercase tracking-wider text-muted">
        {title}
      </h2>
      <ul className="space-y-2">
        {items.map((item) => {
          const done = !!state[item.id];
          const Icon = KIND_ICON[item.kind] ?? FileText;
          return (
            <li key={item.id}>
              <Card className={`!p-4 transition ${done ? 'bg-success/5 border-success/30' : 'bg-white'}`}>
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={done}
                    aria-label={`Mark "${item.title}" as ${done ? 'not done' : 'done'}`}
                    disabled={busy === item.id}
                    onClick={() => onToggle(item.id)}
                    className={`tap mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border transition disabled:opacity-50 ${
                      done
                        ? 'border-success bg-success text-white'
                        : 'border-input-border bg-white hover:border-ink'
                    }`}
                  >
                    {done && <Check className="h-4 w-4" />}
                  </button>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-semibold ${done ? 'text-muted line-through' : 'text-ink'}`}>
                        {item.title}
                      </span>
                      {item.is_mandatory && !done && <Badge tone="accent">Required</Badge>}
                      {item.category && <Badge tone="muted">{item.category.name}</Badge>}
                    </div>

                    {item.description && (
                      <p className="text-xs text-charcoal leading-relaxed">{item.description}</p>
                    )}

                    <div className="flex items-center gap-3 pt-0.5">
                      <span className="flex items-center gap-1 font-mono-utility text-[10px] uppercase tracking-wider text-muted">
                        <Icon className="h-3.5 w-3.5" />
                        {KIND_LABEL[item.kind] ?? item.kind}
                      </span>
                      {/* Nothing is seeded with a content_url yet, so the link only
                          appears once real material is attached to the item. */}
                      {item.content_url && (
                        <a
                          href={item.content_url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="tap flex items-center gap-1 text-xs text-accent hover:underline"
                        >
                          Open <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {done && state[item.id] && (
                        <span className="text-[10px] text-muted">
                          Done {ukDate(state[item.id]!)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
