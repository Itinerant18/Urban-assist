'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, Badge, EmptyState } from '@urban-assist/ui';
import { ukDate } from '@urban-assist/lib';
import { Check, ExternalLink, PlayCircle, FileText, Users, ChevronRight } from 'lucide-react';

interface Item {
  id: string;
  title: string;
  description: string | null;
  content_url: string | null;
  kind: 'video' | 'doc' | 'in_person' | 'quiz';
  is_mandatory: boolean;
  gates_category?: boolean;
  pass_score?: number | null;
  estimated_mins?: number | null;
  category: { name: string } | null;
  completed_at: string | null;
}

const KIND_ICON = {
  video: PlayCircle,
  doc: FileText,
  in_person: Users,
  quiz: FileText,
} as const;

const KIND_LABEL = {
  video: 'Video',
  doc: 'Reading',
  in_person: 'In person',
  quiz: 'Quiz',
} as const;

export function TrainingList({
  items,
  summary,
}: {
  items: Item[];
  summary?: {
    mandatoryCompleted: number;
    mandatoryTotal: number;
    gatedCategoriesIncomplete: number;
  };
}) {
  const [state, setState] = React.useState<Record<string, string | null>>(() =>
    Object.fromEntries(items.map((i) => [i.id, i.completed_at])),
  );
  const [busy, setBusy] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  async function toggle(id: string) {
    const item = items.find((i) => i.id === id);
    if (item?.pass_score != null) {
      // Quiz modules must be completed via the detail quiz UI.
      window.location.href = `/training/${id}`;
      return;
    }
    const next = !state[id];
    setBusy(id);
    setErr(null);
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
  const mandatoryDone =
    summary?.mandatoryCompleted ?? mandatory.filter((i) => state[i.id]).length;
  const mandatoryTotal = summary?.mandatoryTotal ?? mandatory.length;

  return (
    <div className="space-y-5 py-2">
      <header className="space-y-1">
        <h1 className="font-display text-xl uppercase font-bold text-ink tracking-tight">
          Training
        </h1>
        {mandatoryTotal > 0 && (
          <p className="text-xs text-muted">
            {mandatoryDone} of {mandatoryTotal} required completed
            {summary && summary.gatedCategoriesIncomplete > 0
              ? ` · ${summary.gatedCategoriesIncomplete} categor${
                  summary.gatedCategoriesIncomplete === 1 ? 'y' : 'ies'
                } need gating modules`
              : ''}
          </p>
        )}
      </header>

      {mandatoryTotal > 0 && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-hairline">
          <div
            className="h-full rounded-full bg-success transition-all duration-500"
            style={{ width: `${(mandatoryDone / mandatoryTotal) * 100}%` }}
          />
        </div>
      )}

      {err && <p className="text-xs font-medium text-danger">{err}</p>}

      {items.length === 0 ? (
        <EmptyState
          title="No training yet"
          description="Training relevant to the services you offer will appear here."
        />
      ) : (
        <>
          <Section title="Required" items={mandatory} state={state} busy={busy} onToggle={toggle} />
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
        Marking complete records that you have finished the module. We may ask you to confirm this
        during a quality review. Quizzes for high-risk categories will replace self-attest soon.
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
      <h2 className="font-mono-utility text-[11px] uppercase tracking-wider text-muted">{title}</h2>
      <ul className="space-y-2">
        {items.map((item) => {
          const done = !!state[item.id];
          const Icon = KIND_ICON[item.kind] ?? FileText;
          return (
            <li key={item.id}>
              <Card
                className={`!p-4 transition ${done ? 'border-success/30 bg-success/5' : 'bg-white'}`}
              >
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

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/training/${item.id}`}
                        className={`text-sm font-semibold hover:underline ${
                          done ? 'text-muted line-through' : 'text-ink'
                        }`}
                      >
                        {item.title}
                      </Link>
                      {item.is_mandatory && !done && <Badge tone="accent">Required</Badge>}
                      {item.gates_category && <Badge tone="warning">Gates</Badge>}
                      {item.pass_score != null && <Badge tone="muted">Quiz</Badge>}
                      {item.category && <Badge tone="muted">{item.category.name}</Badge>}
                    </div>

                    {item.description && (
                      <p className="text-xs leading-relaxed text-charcoal">{item.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 pt-0.5">
                      <span className="flex items-center gap-1 font-mono-utility text-[11px] uppercase tracking-wider text-muted">
                        <Icon className="h-3.5 w-3.5" />
                        {KIND_LABEL[item.kind] ?? item.kind}
                        {item.estimated_mins != null ? ` · ${item.estimated_mins}m` : ''}
                      </span>
                      {item.content_url && (
                        <a
                          href={item.content_url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="tap flex items-center gap-1 text-xs text-accent-deep hover:underline"
                        >
                          Open <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {done && state[item.id] && (
                        <span className="text-[11px] text-muted">
                          Done {ukDate(state[item.id]!)}
                        </span>
                      )}
                      <Link
                        href={`/training/${item.id}`}
                        className="tap ml-auto inline-flex items-center gap-0.5 text-xs font-semibold text-accent-deep"
                      >
                        Details <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
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
