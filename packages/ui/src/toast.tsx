'use client';
/**
 * Toasts. Replaces native alert() and the ad-hoc "saved!" strings.
 *
 * Module-level emitter rather than context: `toast('Saved')` works from event
 * handlers, server-action callbacks and non-React helpers without threading a
 * hook through every caller. Mount <Toaster /> once per app layout.
 */
import * as React from 'react';
import { cn } from './cn';

export type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

const listeners = new Set<(t: ToastItem) => void>();
let nextId = 0;

export function toast(message: string, tone: ToastTone = 'info') {
  const item = { id: nextId++, message, tone };
  listeners.forEach((l) => l(item));
}

toast.success = (m: string) => toast(m, 'success');
toast.error = (m: string) => toast(m, 'error');

const TONE_STYLES: Record<ToastTone, string> = {
  success: 'border-success/40 bg-white text-ink',
  error: 'border-danger/40 bg-white text-ink',
  info: 'border-hairline bg-white text-ink',
};

const TONE_DOT: Record<ToastTone, string> = {
  success: 'bg-success',
  error: 'bg-danger',
  info: 'bg-ink',
};

const DISMISS_MS = 4500;

export function Toaster() {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onToast = (t: ToastItem) => {
      setItems((prev) => [...prev.slice(-2), t]);
      setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== t.id)), DISMISS_MS);
    };
    listeners.add(onToast);
    return () => {
      listeners.delete(onToast);
    };
  }, []);

  // Manual popover so toasts share the browser top layer with <dialog> — a plain
  // z-index (any z-index) renders *behind* an open showModal() dialog, which is
  // exactly where "Service removed" fired from a confirm used to end up. Re-shown
  // per toast so the stack hops above any dialog opened since. Browsers without
  // the Popover API fall back to the always-visible fixed div.
  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof el.showPopover !== 'function') return;
    if (el.matches(':popover-open')) el.hidePopover();
    if (items.length > 0) el.showPopover();
  }, [items]);

  return (
    <div
      ref={ref}
      popover="manual"
      className="pointer-events-none fixed inset-x-0 bottom-auto top-[calc(env(safe-area-inset-top)+0.75rem)] z-toast m-0 flex w-full max-w-none flex-col items-center gap-2 overflow-visible border-0 bg-transparent p-0 px-4 lg:bottom-6 lg:top-auto"
      aria-live="polite"
      role="status"
    >
      {items.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-hero animate-toast-in',
            TONE_STYLES[t.tone],
          )}
        >
          <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', TONE_DOT[t.tone])} aria-hidden />
          <p className="flex-1">{t.message}</p>
          <button
            type="button"
            onClick={() => setItems((prev) => prev.filter((i) => i.id !== t.id))}
            aria-label="Dismiss"
            className="-my-1 -mr-1 shrink-0 rounded-lg p-1 text-muted transition duration-fast hover:text-ink"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
