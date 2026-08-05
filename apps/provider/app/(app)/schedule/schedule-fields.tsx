'use client';
import * as React from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { ukDate } from '@urban-assist/lib';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

function parseTime(value: string): { h: string; m: string } {
  const [h = '09', m = '00'] = value.split(':');
  return { h: h.padStart(2, '0'), m: m.padStart(2, '0') };
}

function minuteOptions(current: string): string[] {
  return MINUTES.includes(current) ? MINUTES : [...MINUTES, current].sort();
}

const selectClass =
  'appearance-none bg-transparent text-sm text-ink tabular-nums focus:outline-none disabled:text-muted cursor-pointer disabled:cursor-not-allowed';

/** Readable 24h time control — avoids native spinbutton hour/minute/AM-PM clipping. */
export function TimeField({
  value,
  onChange,
  disabled,
  'aria-label': ariaLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  'aria-label'?: string;
}) {
  const { h, m } = parseTime(value);
  const mins = minuteOptions(m);

  return (
    <div
      className={`tap flex min-w-[7.5rem] flex-1 items-center justify-center gap-0.5 rounded-xl border border-hairline bg-white px-2 py-2 ${
        disabled ? 'opacity-50' : 'focus-within:border-ink'
      }`}
      role="group"
      aria-label={ariaLabel}
    >
      <select
        className={selectClass}
        value={h}
        disabled={disabled}
        aria-label={ariaLabel ? `${ariaLabel} hour` : 'Hour'}
        onChange={(e) => onChange(`${e.target.value}:${m}`)}
      >
        {HOURS.map((hour) => (
          <option key={hour} value={hour}>
            {hour}
          </option>
        ))}
      </select>
      <span className="text-sm text-muted" aria-hidden>
        :
      </span>
      <select
        className={selectClass}
        value={m}
        disabled={disabled}
        aria-label={ariaLabel ? `${ariaLabel} minutes` : 'Minutes'}
        onChange={(e) => onChange(`${h}:${e.target.value}`)}
      >
        {mins.map((min) => (
          <option key={min} value={min}>
            {min}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Custom checkbox using ink fill — native accent-color falls back to system orange. */
export function DayCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={`Available on ${label}`}
      onClick={() => onChange(!checked)}
      className="flex w-[7.25rem] shrink-0 items-center gap-2.5 text-left"
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
          checked
            ? 'border-ink bg-ink text-bg'
            : 'border-[rgb(var(--input-border))] bg-white'
        }`}
        aria-hidden
      >
        {checked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
      </span>
      <span
        className={`text-sm transition-colors ${
          checked ? 'font-semibold text-ink' : 'font-normal text-muted'
        }`}
      >
        {label}
      </span>
    </button>
  );
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

const WEEKDAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

/** Calendar date field — replaces native day/month/year spinbuttons. */
export function DateField({
  label,
  value,
  onChange,
  min,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  min?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const today = toISODate(new Date());
  const minDate = min ?? today;

  const initialMonth = value
    ? startOfMonth(new Date(value + 'T12:00:00'))
    : startOfMonth(new Date());
  const [viewMonth, setViewMonth] = React.useState(initialMonth);

  React.useEffect(() => {
    if (open) {
      setViewMonth(
        value
          ? startOfMonth(new Date(value + 'T12:00:00'))
          : startOfMonth(new Date()),
      );
    }
  }, [open, value]);

  React.useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ iso: string; day: number } | null> = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ iso: toISODate(new Date(year, month, day)), day });
  }

  const monthLabel = new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
  }).format(viewMonth);

  return (
    <div className="relative space-y-1.5" ref={rootRef}>
      <span className="text-xs font-medium text-muted">{label}</span>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`tap flex w-full items-center rounded-xl border border-hairline bg-white px-3.5 py-2.5 text-left text-sm focus:border-ink focus:outline-none ${
          value ? 'text-ink' : 'text-muted'
        }`}
      >
        {value ? ukDate(value) : 'Select date'}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={`Choose ${label.toLowerCase()}`}
          className="absolute left-0 right-0 z-30 mt-1 rounded-xl border border-hairline bg-white p-3 shadow-[0_8px_24px_rgba(31,58,77,0.12)]"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              className="tap inline-flex items-center justify-center rounded-lg p-1.5 text-ink hover:bg-bg"
              aria-label="Previous month"
              onClick={() => setViewMonth((m) => addMonths(m, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-sm font-medium text-ink">{monthLabel}</p>
            <button
              type="button"
              className="tap inline-flex items-center justify-center rounded-lg p-1.5 text-ink hover:bg-bg"
              aria-label="Next month"
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-0.5">
            {WEEKDAY_LABELS.map((d) => (
              <span
                key={d}
                className="py-1 text-center font-mono-utility text-[11px] text-muted"
              >
                {d}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((cell, i) => {
              if (!cell) return <span key={`e-${i}`} />;
              const disabled = cell.iso < minDate;
              const selected = cell.iso === value;
              const isToday = cell.iso === today;
              return (
                <button
                  key={cell.iso}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange(cell.iso);
                    setOpen(false);
                  }}
                  aria-current={isToday ? 'date' : undefined}
                  aria-pressed={selected}
                  className={`flex h-11 min-w-11 items-center justify-center rounded-lg text-sm transition-colors ${
                    selected
                      ? 'bg-ink text-bg font-semibold'
                      : disabled
                        ? 'text-muted/40 cursor-not-allowed'
                        : isToday
                          ? 'text-ink font-medium ring-1 ring-ink/25 hover:bg-ink/5'
                          : 'text-ink hover:bg-ink/5'
                  }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
