'use client';
import * as React from 'react';
import { Card, Button, Badge, EmptyState } from '@urban-assist/ui';
import { getSupabaseBrowser as supabase } from '@urban-assist/db/browser';
import { ukDate, ukDateTime } from '@urban-assist/lib';
import { Calendar, Check, Clock, Coffee, History, Plus, Trash2 } from 'lucide-react';
import { DateField, DayCheckbox, TimeField } from './schedule-fields';

// DB convention: weekday 0 = Sunday (matches JS getDay()). UI renders Monday-first.
const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday-first

interface DayWindow {
  enabled: boolean;
  start: string; // 'HH:MM'
  end: string;
}

interface TimeOff {
  id: string;
  start_date: string;
  end_date: string;
}

interface UpcomingJob {
  id: string;
  short_code: string;
  scheduled_at: string;
  status: string;
  price_pence: number;
  total_pence: number;
  category: { name: string };
  address: { line1: string; postcode: string };
}

function defaultWeek(): Record<number, DayWindow> {
  const wk: Record<number, DayWindow> = {};
  for (let d = 0; d < 7; d++) wk[d] = { enabled: false, start: '09:00', end: '17:00' };
  return wk;
}

function minutesBetween(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

function formatWeeklyHours(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0 hrs/week configured';
  const hours = totalMinutes / 60;
  const rounded = Number.isInteger(hours) ? String(hours) : hours.toFixed(1).replace(/\.0$/, '');
  return `${rounded} hrs/week configured`;
}

export default function SchedulePage() {
  const [tab, setTab] = React.useState<'jobs' | 'history' | 'availability'>('jobs');
  const [loading, setLoading] = React.useState(true);
  const [userId, setUserId] = React.useState<string | null>(null);

  const [jobs, setJobs] = React.useState<UpcomingJob[]>([]);
  const [history, setHistory] = React.useState<UpcomingJob[]>([]);
  const [week, setWeek] = React.useState<Record<number, DayWindow>>(defaultWeek);
  const [timeOffList, setTimeOffList] = React.useState<TimeOff[]>([]);

  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [scheduleError, setScheduleError] = React.useState<string | null>(null);

  const [newStartOff, setNewStartOff] = React.useState('');
  const [newEndOff, setNewEndOff] = React.useState('');
  const [timeOffError, setTimeOffError] = React.useState<string | null>(null);
  const [timeOffSaved, setTimeOffSaved] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const scrollByTab = React.useRef({ jobs: 0, history: 0, availability: 0 });

  function switchTab(next: 'jobs' | 'history' | 'availability') {
    if (next === tab) return;
    scrollByTab.current[tab] = window.scrollY;
    setTab(next);
  }

  React.useEffect(() => {
    window.scrollTo(0, scrollByTab.current[tab]);
  }, [tab]);

  React.useEffect(() => {
    async function loadData() {
      try {
        const sb = supabase();
        const { data: { user } } = await sb.auth.getUser();
        if (!user) return;
        setUserId(user.id);

        const todayStr = new Date();
        todayStr.setHours(0, 0, 0, 0);

        const { data: jobsData } = await sb
          .from('bookings')
          .select('id, short_code, scheduled_at, status, price_pence, total_pence, category:service_categories(name), address:addresses(line1,postcode)')
          .eq('provider_id', user.id)
          .gte('scheduled_at', todayStr.toISOString())
          .in('status', ['assigned', 'on_the_way', 'arrived', 'in_progress'])
          .order('scheduled_at');

        const { data: historyData } = await sb
          .from('bookings')
          .select('id, short_code, scheduled_at, status, price_pence, total_pence, category:service_categories(name), address:addresses(line1,postcode)')
          .eq('provider_id', user.id)
          .in('status', ['completed', 'cancelled', 'disputed'])
          .order('scheduled_at', { ascending: false })
          .limit(20);

        const { data: slotsData } = await sb
          .from('availability_slots')
          .select('*')
          .eq('provider_id', user.id)
          .order('weekday')
          .order('start_time');

        const { data: timeOffData } = await sb
          .from('time_off')
          .select('*')
          .eq('provider_id', user.id)
          .gte('end_date', todayStr.toISOString().split('T')[0])
          .order('start_date');

        // ponytail: one window per day; multi-slot days collapse to first — extend to multi-window when a provider asks
        const wk = defaultWeek();
        const claimed = new Set<number>();
        for (const s of slotsData ?? []) {
          if (claimed.has(s.weekday)) continue;
          claimed.add(s.weekday);
          wk[s.weekday] = { enabled: true, start: s.start_time.slice(0, 5), end: s.end_time.slice(0, 5) };
        }

        setJobs(jobsData as any ?? []);
        setHistory(historyData as any ?? []);
        setWeek(wk);
        setTimeOffList(timeOffData ?? []);
      } catch (err) {
        console.error('Failed to load schedule data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  function setDay(d: number, patch: Partial<DayWindow>) {
    setWeek((w) => ({ ...w, [d]: { ...w[d], ...patch } }));
    setSaved(false);
    setScheduleError(null);
  }

  const weeklyMinutes = DAY_ORDER.reduce((sum, d) => {
    const w = week[d];
    if (!w.enabled) return sum;
    const mins = minutesBetween(w.start, w.end);
    return mins > 0 ? sum + mins : sum;
  }, 0);
  const enabledDays = DAY_ORDER.filter((d) => week[d].enabled).length;
  const canAddTimeOff =
    Boolean(newStartOff && newEndOff) && newStartOff <= newEndOff && !submitting;

  async function saveSchedule() {
    if (!userId) return;
    setScheduleError(null);
    setSaved(false);

    const invalid = DAY_ORDER.filter((d) => week[d].enabled && week[d].start >= week[d].end);
    if (invalid.length) {
      setScheduleError(`End time must be after start time: ${invalid.map((d) => WEEKDAYS[d]).join(', ')}`);
      return;
    }

    setSaving(true);
    try {
      const sb = supabase();
      // Replace-all save: simplest model that matches "one window per day".
      const { error: delErr } = await sb.from('availability_slots').delete().eq('provider_id', userId);
      if (delErr) throw delErr;

      const rows = DAY_ORDER.filter((d) => week[d].enabled).map((d) => ({
        provider_id: userId,
        weekday: d,
        start_time: week[d].start + ':00',
        end_time: week[d].end + ':00',
      }));
      if (rows.length) {
        const { error: insErr } = await sb.from('availability_slots').insert(rows);
        if (insErr) throw insErr;
      }
      setSaved(true);
    } catch (err: any) {
      setScheduleError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function addTimeOff(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !canAddTimeOff) return;
    setTimeOffError(null);
    setTimeOffSaved(false);
    setSubmitting(true);

    try {
      if (!newStartOff || !newEndOff) {
        throw new Error('Select both start and end dates');
      }
      if (newStartOff > newEndOff) {
        throw new Error('Start date must be on or before end date');
      }

      const sb = supabase();
      const { data, error } = await sb
        .from('time_off')
        .insert({
          provider_id: userId,
          start_date: newStartOff,
          end_date: newEndOff,
        })
        .select()
        .single();

      if (error) throw error;
      setTimeOffList([...timeOffList, data].sort((a, b) => a.start_date.localeCompare(b.start_date)));
      setNewStartOff('');
      setNewEndOff('');
      setTimeOffSaved(true);
    } catch (err: any) {
      setTimeOffError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteTimeOff(id: string) {
    setTimeOffError(null);
    setTimeOffSaved(false);
    try {
      const sb = supabase();
      const { error } = await sb.from('time_off').delete().eq('id', id);
      if (error) throw error;
      setTimeOffList(timeOffList.filter((t) => t.id !== id));
    } catch (err: any) {
      setTimeOffError(err.message);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 py-8 animate-pulse">
        <div className="h-8 w-48 bg-hairline rounded" />
        <div className="h-12 bg-hairline rounded-xl" />
        <div className="h-64 bg-hairline rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      <header>
        <p className="font-mono-utility text-muted">Management</p>
        <h1 className="font-display text-2xl font-bold text-ink">Schedule</h1>
      </header>

      <div className="flex gap-2 rounded-xl bg-bg p-1.5 border border-hairline" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'jobs'}
          onClick={() => switchTab('jobs')}
          className={`flex-1 rounded-lg py-2.5 text-xs font-mono-utility font-medium transition flex items-center justify-center gap-1.5 ${
            tab === 'jobs' ? 'bg-ink text-bg shadow-sm' : 'text-muted hover:text-ink'
          }`}
        >
          <Calendar className="h-3.5 w-3.5" /> Agenda ({jobs.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'history'}
          onClick={() => switchTab('history')}
          className={`flex-1 rounded-lg py-2.5 text-xs font-mono-utility font-medium transition flex items-center justify-center gap-1.5 ${
            tab === 'history' ? 'bg-ink text-bg shadow-sm' : 'text-muted hover:text-ink'
          }`}
        >
          <History className="h-3.5 w-3.5" /> History
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'availability'}
          onClick={() => switchTab('availability')}
          className={`flex-1 rounded-lg py-2.5 text-xs font-mono-utility font-medium transition flex items-center justify-center gap-1.5 ${
            tab === 'availability' ? 'bg-ink text-bg shadow-sm' : 'text-muted hover:text-ink'
          }`}
        >
          <Clock className="h-3.5 w-3.5" /> Availability
        </button>
      </div>

      <section
        className={`space-y-3 ${tab === 'jobs' ? '' : 'hidden'}`}
        aria-hidden={tab !== 'jobs'}
      >
        {!jobs.length ? (
          <EmptyState
            title="No upcoming jobs"
            description="Your upcoming assigned bookings will be listed here. Go online on the dashboard to accept new offers."
          />
        ) : (
          <ul className="space-y-2.5">
            {jobs.map((j) => (
              <li key={j.id}>
                <Card
                  onClick={() => window.location.href = `/jobs/${j.id}`}
                  className="flex items-center justify-between gap-4 cursor-pointer hover:border-ink transition"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm sm:text-base">
                        {j.category?.name}
                      </span>
                      <Badge tone="accent">
                        {j.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted mt-1">
                      {ukDateTime(j.scheduled_at)} · {[j.address?.line1, j.address?.postcode].filter(Boolean).join(', ')}
                    </p>
                    <p className="font-mono-utility text-muted mt-0.5">#{j.short_code}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={(e) => {
                    e.stopPropagation();
                    window.location.href = `/jobs/${j.id}`;
                  }}>
                    Open
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        className={`space-y-3 ${tab === 'history' ? '' : 'hidden'}`}
        aria-hidden={tab !== 'history'}
      >
        {!history.length ? (
          <EmptyState
            title="No past jobs yet"
            description="Completed and cancelled jobs will appear here."
          />
        ) : (
          <ul className="space-y-2.5">
            {history.map((j) => (
              <li key={j.id}>
                <Card
                  onClick={() => window.location.href = `/jobs/${j.id}`}
                  className="flex items-center justify-between gap-4 cursor-pointer hover:border-ink transition"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm sm:text-base">
                        {j.category?.name}
                      </span>
                      <Badge tone={j.status === 'completed' ? 'success' : 'muted'}>
                        {j.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted mt-1">
                      {ukDateTime(j.scheduled_at)} · {[j.address?.line1, j.address?.postcode].filter(Boolean).join(', ')}
                    </p>
                    <p className="font-mono-utility text-muted mt-0.5">#{j.short_code}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={(e) => {
                    e.stopPropagation();
                    window.location.href = `/jobs/${j.id}`;
                  }}>
                    Open
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        className={`space-y-6 pb-24 lg:pb-0 ${tab === 'availability' ? '' : 'hidden'}`}
        aria-hidden={tab !== 'availability'}
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:items-start">
          <Card className="space-y-5">
            <div className="space-y-3">
              <div>
                <h3 className="mb-2 font-display text-base font-semibold text-ink">Weekly hours</h3>
                <p className="max-w-prose text-sm leading-relaxed text-muted">
                  Set the days and hours you are available. The matching engine only sends you offers inside these windows.
                </p>
              </div>
              <p
                className={`inline-flex shrink-0 rounded-lg px-2.5 py-1 text-xs font-mono-utility font-medium ${
                  weeklyMinutes > 0
                    ? 'bg-ink/[0.08] text-ink'
                    : 'bg-hairline/70 text-muted'
                }`}
                aria-live="polite"
              >
                {formatWeeklyHours(weeklyMinutes)}
                {enabledDays > 0 && (
                  <span className="text-muted font-normal">
                    {' '}· {enabledDays} day{enabledDays === 1 ? '' : 's'}
                  </span>
                )}
              </p>
            </div>

            <div className="overflow-hidden rounded-xl border border-hairline">
              {DAY_ORDER.map((d, i) => {
                const w = week[d];
                const rowInvalid = w.enabled && w.start >= w.end;
                return (
                  <div
                    key={d}
                    className={`px-3 py-3.5 transition-colors ${
                      i > 0 ? 'border-t border-hairline' : ''
                    } ${
                      w.enabled
                        ? 'bg-ink/[0.04]'
                        : i % 2 === 1
                          ? 'bg-bg/60'
                          : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <DayCheckbox
                        checked={w.enabled}
                        onChange={(enabled) => setDay(d, { enabled })}
                        label={WEEKDAYS[d]}
                      />
                      <div
                        className={`flex min-w-0 flex-1 items-center gap-2 transition-opacity ${
                          w.enabled ? 'opacity-100' : 'opacity-40'
                        }`}
                      >
                        <TimeField
                          value={w.start}
                          disabled={!w.enabled}
                          onChange={(start) => setDay(d, { start })}
                          aria-label={`${WEEKDAYS[d]} start time`}
                        />
                        <span className="shrink-0 text-xs text-muted">to</span>
                        <TimeField
                          value={w.end}
                          disabled={!w.enabled}
                          onChange={(end) => setDay(d, { end })}
                          aria-label={`${WEEKDAYS[d]} end time`}
                        />
                      </div>
                    </div>
                    {rowInvalid && (
                      <p className="mt-2 text-xs text-danger">End time must be after start time</p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ponytail: 3.5rem ≈ measured tab-bar height in app-shell.tsx; not tokenized until a second consumer needs it */}
            <div className="fixed inset-x-0 above-tabbar z-sticky border-t border-hairline bg-bg/95 px-4 py-3 backdrop-blur lg:static lg:z-auto lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
              <div className="mb-2 rounded-lg border border-ink/10 bg-ink/[0.04] px-2.5 py-2 text-[11px] leading-snug text-ink/80">
                Saves <span className="font-medium text-ink">weekly hours</span> only.
                Time off saves when you tap Add time off.
              </div>
              {enabledDays === 0 && !saved && (
                <p className="mb-2 text-xs text-muted" role="status">
                  No days enabled — saving will clear your availability windows.
                </p>
              )}
              {scheduleError && <p className="mb-2 text-xs text-danger" role="alert">{scheduleError}</p>}
              {saved && !scheduleError && (
                <p className="mb-2 flex items-center gap-1.5 text-xs text-success-deep" role="status">
                  <Check className="h-3.5 w-3.5" aria-hidden /> Weekly hours saved
                </p>
              )}
              <Button
                onClick={saveSchedule}
                disabled={saving}
                className="w-full"
                aria-busy={saving}
              >
                {saving ? 'Saving weekly hours…' : saved ? 'Weekly hours saved' : 'Save weekly hours'}
              </Button>
            </div>
          </Card>

          <Card className="space-y-5">
            <div>
              <h3 className="mb-2 flex items-center gap-2 font-display text-base font-semibold text-ink">
                <Coffee className="h-4 w-4 text-ink/70" aria-hidden /> Scheduled Time Off
              </h3>
              <p className="text-sm leading-relaxed text-muted">
                Add dates when you want to block out work. The matching engine will not send you offers during these dates.
              </p>
            </div>

            {timeOffList.length > 0 ? (
              <ul className="divide-y divide-hairline overflow-hidden rounded-xl border border-hairline">
                {timeOffList.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 bg-white px-3 py-3">
                    <span className="text-sm font-medium text-ink">
                      {ukDate(t.start_date)}
                      {t.start_date !== t.end_date && ` to ${ukDate(t.end_date)}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteTimeOff(t.id)}
                      className="tap inline-flex items-center justify-center rounded-lg p-2 text-danger hover:bg-danger/10"
                      aria-label="Delete time off"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-xl border border-dashed border-hairline bg-bg/50 px-4 py-6 text-center">
                <Calendar className="mx-auto mb-2 h-5 w-5 text-muted" aria-hidden />
                <p className="text-sm font-medium text-ink">No scheduled time off</p>
                <p className="mt-1 text-xs text-muted">Pick dates below to block days you cannot work.</p>
              </div>
            )}

            <form onSubmit={addTimeOff} className="space-y-3 rounded-xl border border-hairline bg-bg/40 p-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DateField
                  label="Start date"
                  value={newStartOff}
                  onChange={(v) => {
                    setNewStartOff(v);
                    setTimeOffSaved(false);
                    setTimeOffError(null);
                    if (newEndOff && v > newEndOff) setNewEndOff(v);
                  }}
                />
                <DateField
                  label="End date"
                  value={newEndOff}
                  min={newStartOff || undefined}
                  onChange={(v) => {
                    setNewEndOff(v);
                    setTimeOffSaved(false);
                    setTimeOffError(null);
                  }}
                />
              </div>
              {newStartOff && newEndOff && newStartOff > newEndOff && (
                <p className="text-xs text-danger" role="alert">
                  End date must be on or after start date
                </p>
              )}
              {timeOffError && <p className="text-xs text-danger" role="alert">{timeOffError}</p>}
              {timeOffSaved && !timeOffError && (
                <p className="flex items-center gap-1.5 text-xs text-success-deep" role="status">
                  <Check className="h-3.5 w-3.5" aria-hidden /> Time off added
                </p>
              )}
              <Button
                type="submit"
                variant="secondary"
                disabled={!canAddTimeOff}
                className="w-full"
                aria-busy={submitting}
              >
                <Plus className="h-4 w-4" aria-hidden />
                {submitting ? 'Adding…' : 'Add time off'}
              </Button>
              {!newStartOff || !newEndOff ? (
                <p className="text-center text-[11px] text-muted">
                  Select start and end dates to enable Add
                </p>
              ) : null}
            </form>
          </Card>
        </div>
      </section>
    </div>
  );
}
