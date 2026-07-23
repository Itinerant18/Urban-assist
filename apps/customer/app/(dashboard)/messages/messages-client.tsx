'use client';
// Two-pane messaging center. Desktop: list + chat pane. Mobile: list only.
// ponytail: no attach button (no attachment schema/storage) and no unread badges (no read_at column) — add schema first.

import * as React from 'react';
import { Button, EmptyState } from '@urban-assist/ui';
import { getSupabaseBrowser as supabase } from '@urban-assist/db/browser';
import { ArrowLeft, Phone } from 'lucide-react';
import type { ChatMessage } from '@urban-assist/types';

type DisplayMessage = Pick<ChatMessage, 'id' | 'booking_id' | 'sender_id' | 'content' | 'created_at'>;

function mergeMessages(current: DisplayMessage[], incoming: DisplayMessage[]): DisplayMessage[] {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return Array.from(byId.values()).sort((a, b) => a.created_at.localeCompare(b.created_at));
}

type Conversation = {
  id: string;
  short_code: string;
  provider: { id: string; full_name: string | null; avatar_url: string | null; phone: string | null };
  category: { name: string } | null;
  messages: DisplayMessage[];
};

export function MessagesClient({ conversations, userId }: { conversations: Conversation[]; userId: string }) {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [draft, setDraft] = React.useState('');
  const [history, setHistory] = React.useState<Record<string, DisplayMessage[]>>(() =>
    Object.fromEntries(conversations.map((c) => [c.id, c.messages ?? []])),
  );
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  // Realtime: new messages for the open conversation (same pattern as booking-detail).
  React.useEffect(() => {
    if (!selectedId) return;
    const sb = supabase();
    const ch = sb
      .channel(`messages-${selectedId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `booking_id=eq.${selectedId}` },
        (p) =>
          setHistory((h) => {
            const cur = h[selectedId] ?? [];
            return { ...h, [selectedId]: mergeMessages(cur, [p.new as DisplayMessage]) };
          }),
      )
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [selectedId]);

  React.useEffect(() => {
    if (!selectedId) return;
    let active = true;
    let unsubscribe: (() => void) | undefined;

    async function connectChat() {
      try {
        const response = await fetch('/api/firebase/token', { method: 'POST' });
        if (!response.ok) return;
        const payload = (await response.json()) as { token?: string };
        if (!payload.token || !active || !selectedId) return;
        const { subscribeToBookingChat } = await import(
          '@urban-assist/integrations/firebase/chat-client'
        );
        unsubscribe = await subscribeToBookingChat({
          bookingId: selectedId,
          customToken: payload.token,
          participant: 'customer_id',
          onMessages(incoming) {
            if (!active || !selectedId) return;
            setHistory((current) => ({
              ...current,
              [selectedId]: mergeMessages(current[selectedId] ?? [], incoming),
            }));
          },
        });
      } catch (error) {
        console.warn('[urban-assist] Firebase chat unavailable', error);
      }
    }

    void connectChat();
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [selectedId]);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [selectedId, history]);

  // ponytail: client filter, server search when volume
  const q = search.trim().toLowerCase();
  const filtered = q
    ? conversations.filter(
        (c) =>
          (c.provider.full_name ?? '').toLowerCase().includes(q) ||
          (c.category?.name ?? '').toLowerCase().includes(q),
      )
    : conversations;

  function open(id: string) {
    setSelectedId(id);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || !selectedId) return;
    const body = draft;
    setDraft('');
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ booking_id: selectedId, content: body }),
    });
  }

  if (!conversations.length) {
    return (
      <div className="space-y-4 py-2">
        <h1 className="font-display text-2xl font-bold text-ink">Messages</h1>
        <EmptyState
          title="No conversations yet"
          description="Once a provider is matched to your booking, you'll be able to chat with them here."
        />
      </div>
    );
  }

  const msgs = selected ? history[selected.id] ?? [] : [];

  return (
    <div className="py-2 h-[calc(100vh-8rem)] relative">
      {/* Mobile view logic */}
      <div className="lg:hidden h-full flex flex-col">
        {!selected ? (
          /* Mobile List View */
          <div className="flex flex-col h-full space-y-3">
            <h1 className="font-display text-2xl font-bold text-ink">Messages</h1>
            <input
              className="tap w-full rounded-xl border border-hairline bg-white px-3.5 py-2.5 text-sm focus:border-ink focus:outline-none"
              placeholder="Search chats..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <ul className="flex-1 space-y-2 overflow-y-auto pb-6">
              {filtered.map((c) => {
                const last = (history[c.id] ?? [])[history[c.id]?.length - 1];
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => open(c.id)}
                      className="tap flex w-full items-center gap-3 rounded-2xl border border-hairline bg-white p-4 text-left transition hover:bg-bg/25 shadow-sm"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-hairline font-bold text-ink">
                        {c.provider.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.provider.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          (c.provider.full_name ?? '?').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-bold text-sm text-ink">{c.provider.full_name}</span>
                          {last && <span className="shrink-0 text-[10px] text-muted">{listStamp(last.created_at)}</span>}
                        </div>
                        <div className="text-[10px] font-semibold text-muted mt-0.5">{c.category?.name}</div>
                        <p className="truncate text-xs text-muted mt-1">{last?.content ?? 'Say hi to your provider'}</p>
                      </div>
                    </button>
                  </li>
                );
              })}
              {!filtered.length && (
                <li><EmptyState title="No matching conversations" description={`No chats match “${search}”.`} /></li>
              )}
            </ul>
          </div>
        ) : (
          /* Mobile Chat Full-Screen Takeover */
          <div className="fixed inset-0 z-50 flex flex-col bg-bg">
            {/* Mobile Header */}
            <div className="flex items-center justify-between border-b border-hairline bg-white px-4 py-3 shadow-sm">
              <button
                aria-label="Back to conversations"
                onClick={() => setSelectedId(null)}
                className="tap flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden /> Back
              </button>
              <div className="text-center min-w-0 flex-1 px-4">
                <h2 className="font-display text-sm font-bold text-ink truncate">{selected.provider.full_name}</h2>
                <p className="text-[10px] text-muted truncate">
                  {selected.category?.name} · #{selected.short_code}
                </p>
              </div>
              {selected.provider.phone ? (
                <a
                  href={`tel:${selected.provider.phone}`}
                  aria-label={`Call ${selected.provider.full_name ?? 'provider'}`}
                  className="rounded-full bg-accent/10 p-2 text-accent hover:bg-accent/20"
                >
                  <Phone className="h-4 w-4" />
                </a>
              ) : (
                <div className="w-8" />
              )}
            </div>

            {/* Messages Timeline */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-xs">
              {msgs.length === 0 && <p className="text-center text-muted py-8">No messages yet — say hi.</p>}
              {msgs.map((m, i) => {
                const label = dayLabel(m.created_at);
                const showDivider = i === 0 || dayLabel(msgs[i - 1].created_at) !== label;
                const mine = m.sender_id === userId;
                return (
                  <React.Fragment key={m.id}>
                    {showDivider && <div className="py-2 text-center text-[10px] text-muted font-bold">{label}</div>}
                    <div
                      className={`flex max-w-[80%] flex-col rounded-2xl px-3.5 py-2.5 shadow-sm leading-relaxed ${
                        mine ? 'ml-auto bg-accent text-white' : 'mr-auto bg-white text-ink border border-hairline'
                      }`}
                    >
                      <span>{m.content}</span>
                      <span className={`mt-1 self-end text-[9px] ${mine ? 'text-white/70' : 'text-muted'}`}>
                        {hhmm(m.created_at)}
                      </span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

            {/* Mobile Footer Message Input */}
            <form onSubmit={send} className="border-t border-hairline bg-white/95 px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur flex gap-2">
              <input
                className="tap flex-1 rounded-xl border border-hairline bg-white px-3.5 py-2 text-sm focus:border-ink focus:outline-none"
                placeholder="Type a message..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <Button type="submit" disabled={!draft.trim()}>
                SEND
              </Button>
            </form>
          </div>
        )}
      </div>

      {/* Desktop side-by-side view (lg+) */}
      <div className="hidden lg:grid lg:h-full lg:grid-cols-[320px_1fr] lg:gap-4">
        {/* Left: conversation list */}
        <div className="flex min-h-0 flex-col space-y-3">
          <h1 className="font-display text-2xl font-bold text-ink">Messages</h1>
          <input
            className="tap w-full rounded-xl border border-hairline bg-white px-3 py-2 text-sm focus:border-ink focus:outline-none"
            placeholder="Search chats..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto">
            {filtered.map((c) => {
              const last = (history[c.id] ?? [])[history[c.id]?.length - 1];
              const isSelected = c.id === selectedId;
              return (
                <li key={c.id}>
                  <button
                    onClick={() => open(c.id)}
                    className={`tap flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                      isSelected ? 'bg-accent/10' : 'hover:bg-bg'
                    }`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-hairline font-medium text-ink">
                      {c.provider.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.provider.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        (c.provider.full_name ?? '?').charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium">{c.provider.full_name}</span>
                        {last && <span className="shrink-0 text-[11px] text-muted">{listStamp(last.created_at)}</span>}
                      </div>
                      <div className="text-[11px] text-muted">{c.category?.name}</div>
                      <p className="truncate text-sm text-muted">{last?.content ?? 'Say hi to your provider'}</p>
                    </div>
                  </button>
                </li>
              );
            })}
            {!filtered.length && (
              <li><EmptyState title="No matching conversations" description={`No chats match “${search}”.`} /></li>
            )}
          </ul>
        </div>

        {/* Right: chat pane */}
        <div className="flex min-h-0 flex-col rounded-2xl border border-hairline bg-white shadow-card">
          {!selected ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted">Select a conversation</div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
                <div className="font-medium text-ink">
                  {selected.provider.full_name}{' '}
                  <span className="text-sm font-normal text-muted">
                    ({selected.category?.name} · #{selected.short_code})
                  </span>
                </div>
                {selected.provider.phone && (
                  <a
                    href={`tel:${selected.provider.phone}`}
                    className="flex items-center gap-1 text-sm font-medium text-accent hover:underline"
                  >
                    <Phone className="h-4 w-4" /> Call
                  </a>
                )}
              </div>
              <div ref={scrollRef} className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-4 py-3 text-sm bg-bg/5">
                {msgs.length === 0 && <p className="text-muted">No messages yet — say hi to your provider.</p>}
                {msgs.map((m, i) => {
                  const label = dayLabel(m.created_at);
                  const showDivider = i === 0 || dayLabel(msgs[i - 1].created_at) !== label;
                  const mine = m.sender_id === userId;
                  return (
                    <React.Fragment key={m.id}>
                      {showDivider && <div className="py-1.5 text-center text-[11px] text-muted">{label}</div>}
                      <div
                        className={`flex max-w-[75%] flex-col rounded-xl px-3 py-2 shadow-sm ${
                          mine ? 'ml-auto bg-accent text-white' : 'mr-auto bg-white text-ink border border-hairline'
                        }`}
                      >
                        <span>{m.content}</span>
                        <span className={`mt-0.5 self-end text-[11px] ${mine ? 'text-white/70' : 'text-muted'}`}>
                          {hhmm(m.created_at)}
                        </span>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
              <form onSubmit={send} className="flex gap-2 border-t border-hairline p-3 bg-white">
                <input
                  className="tap flex-1 rounded-xl border border-hairline bg-white px-3 py-2 text-sm focus:border-ink focus:outline-none"
                  placeholder="Type your message..."
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <Button type="submit" disabled={!draft.trim()}>
                  SEND
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function hhmm(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function listStamp(iso: string) {
  const d = new Date(iso);
  if (d.toDateString() === new Date().toDateString()) return hhmm(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
