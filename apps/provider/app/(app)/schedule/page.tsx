'use client';
import * as React from 'react';
import { Card, Button, Badge, Field, Input, EmptyState } from '@urban-assist/ui';
import { getSupabaseBrowser as supabase } from '@urban-assist/db/browser';
import { ukDate, ukDateTime } from '@urban-assist/lib';
import { Calendar, Clock, Coffee, Plus, Trash2 } from 'lucide-react';

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

// '09:00' → '9', '17:30' → '5:30' — week-strip chip shorthand.
function shortTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  const h12 = h % 12 || 12;
  return m ? `${h12}:${String(m).padStart(2, '0')}` : `${h12}`;
}

export default function SchedulePage() {
  const [tab, setTab] = React.useState<'jobs' | 'availability'>('jobs');
  const [loading, setLoading] = React.useState(true);
  const [userId, setUserId] = React.useState<string | null>(null);

  const [jobs, setJobs] = React.useState<UpcomingJob[]>([]);
  const [week, setWeek] = React.useState<Record<number, DayWindow>>(defaultWeek);
  const [timeOffList, setTimeOffList] = React.useState<TimeOff[]>([]);

  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [scheduleError, setScheduleError] = React.useState<string | null>(null);

  const [newStartOff, setNewStartOff] = React.useState('');
  const [newEndOff, setNewEndOff] = React.useState('');
  const [timeOffError, setTimeOffError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

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
    if (!userId) return;
    setTimeOffError(null);
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
    } catch (err: any) {
      setTimeOffError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteTimeOff(id: string) {
    setTimeOffError(null);
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
    <div className="space-y-5 py-2">
      <header>
        <p className="font-mono-utility text-muted">Management</p>
        <h1 className="font-display text-2xl font-bold text-ink">Schedule</h1>
      </header>

      {/* Tabs selector */}
      <div className="flex gap-2 rounded-xl bg-bg p-1 border border-hairline">
        <button
          onClick={() => setTab('jobs')}
          className={`flex-1 rounded-lg py-2.5 text-xs font-mono-utility font-medium transition flex items-center justify-center gap-1.5 ${
            tab === 'jobs' ? 'bg-ink text-bg shadow-sm' : 'text-muted hover:text-ink'
          }`}
        >
          <Calendar className="h-3.5 w-3.5" /> Agenda ({jobs.length})
        </button>
        <button
          onClick={() => setTab('availability')}
          className={`flex-1 rounded-lg py-2.5 text-xs font-mono-utility font-medium transition flex items-center justify-center gap-1.5 ${
            tab === 'availability' ? 'bg-ink text-bg shadow-sm' : 'text-muted hover:text-ink'
          }`}
        >
          <Clock className="h-3.5 w-3.5" /> Availability
        </button>
      </div>

      {/* Agenda/Upcoming Jobs */}
      {tab === 'jobs' && (
        <section className="space-y-3">
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
      )}

      {/* Availability: week strip + weekly hours editor + time off, co-visible */}
      {tab === 'availability' && (
        <section className="space-y-4 pb-24 lg:pb-0">
          {/* Week strip — desktop only, derived from editor state */}
          <div className="hidden lg:grid grid-cols-7 gap-2">
            {DAY_ORDER.map((d) => (
              <div
                key={d}
                className={`rounded-xl border border-hairline px-2 py-2 text-center ${
                  week[d].enabled ? 'bg-accent/10' : ''
                }`}
              >
                <p className="font-mono-utility text-[10px] text-muted">{WEEKDAYS[d].slice(0, 3)}</p>
                <p className={`text-xs font-medium ${week[d].enabled ? 'text-ink' : 'text-muted'}`}>
                  {week[d].enabled ? `${shortTime(week[d].start)}–${shortTime(week[d].end)}` : 'OFF'}
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:items-start">
            {/* Weekly hours editor */}
            <Card className="space-y-3">
              <h3 className="font-display text-sm font-semibold">Weekly hours</h3>
              <p className="text-xs text-muted">
                Set the days and hours you are available. The matching engine only sends you offers inside these windows.
              </p>
              <div className="divide-y divide-hairline">
                {DAY_ORDER.map((d) => {
                  const w = week[d];
                  const rowInvalid = w.enabled && w.start >= w.end;
                  return (
                    <div key={d} className="py-2.5 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <label className="flex w-28 shrink-0 items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={w.enabled}
                            onChange={(e) => setDay(d, { enabled: e.target.checked })}
                            className="h-4 w-4 accent-[rgb(var(--accent))]"
                          />
                          <span className={`text-sm ${w.enabled ? 'text-ink font-medium' : 'text-muted'}`}>
                            {WEEKDAYS[d]}
                          </span>
                        </label>
                        <div className={`flex flex-1 items-center gap-2 ${w.enabled ? '' : 'opacity-40'}`}>
                          <Input
                            type="time"
                            value={w.start}
                            disabled={!w.enabled}
                            onChange={(e) => setDay(d, { start: e.target.value })}
                          />
                          <span className="text-xs text-muted">to</span>
                          <Input
                            type="time"
                            value={w.end}
                            disabled={!w.enabled}
                            onChange={(e) => setDay(d, { end: e.target.value })}
                          />
                        </div>
                      </div>
                      {rowInvalid && (
                        <p className="mt-1 text-xs text-danger">End time must be after start time</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Save bar — fixed above the AppShell bottom tab bar on mobile, static in the card on lg+ */}
              {/* ponytail: 3.5rem ≈ measured tab-bar height in app-shell.tsx; not tokenized until a second consumer needs it */}
              <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 border-t border-hairline bg-bg/95 px-4 py-3 backdrop-blur lg:static lg:z-auto lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
                {scheduleError && <p className="mb-2 text-xs text-danger">{scheduleError}</p>}
                <Button onClick={saveSchedule} disabled={saving} className="w-full">
                  {saving ? 'Saving…' : saved ? 'Saved' : 'Save schedule'}
                </Button>
              </div>
            </Card>

            {/* Time off panel */}
            <Card className="space-y-3">
              <h3 className="font-display text-sm font-semibold flex items-center gap-2">
                <Coffee className="h-4 w-4 text-muted" /> Scheduled Time Off
              </h3>
              <p className="text-xs text-muted">
                Add dates when you want to block out work. The matching engine will not send you offers during these dates.
              </p>
              {timeOffList.length > 0 ? (
                <ul className="space-y-2 divide-y divide-hairline">
                  {timeOffList.map((t) => (
                    <li key={t.id} className="flex items-center justify-between pt-2 first:pt-0">
                      <span className="text-sm font-medium">
                        {ukDate(t.start_date)}
                        {t.start_date !== t.end_date && ` to ${ukDate(t.end_date)}`}
                      </span>
                      <button
                        onClick={() => deleteTimeOff(t.id)}
                        className="tap p-1 text-danger hover:brightness-95"
                        aria-label="Delete time off"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">No scheduled time off.</p>
              )}

              <form onSubmit={addTimeOff} className="space-y-3 border-t border-hairline pt-3">
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Start date">
                    <Input
                      type="date"
                      required
                      value={newStartOff}
                      onChange={(e) => setNewStartOff(e.target.value)}
                    />
                  </Field>
                  <Field label="End date">
                    <Input
                      type="date"
                      required
                      value={newEndOff}
                      onChange={(e) => setNewEndOff(e.target.value)}
                    />
                  </Field>
                </div>
                {timeOffError && <p className="text-xs text-danger">{timeOffError}</p>}
                <Button type="submit" variant="outline" disabled={submitting} className="w-full flex items-center justify-center gap-1">
                  <Plus className="h-4 w-4" /> Add time off
                </Button>
              </form>
            </Card>
          </div>
        </section>
      )}
    </div>
  );
}
