'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, Button, Badge } from '@urban-assist/ui';
import { Bell, MapPin, CreditCard, FileText, LifeBuoy, ChevronRight } from 'lucide-react';
import { postCurrentLocation } from '../../../lib/post-location';

type Permission = 'granted' | 'denied' | 'default' | 'unsupported';

export function SettingsView({
  hasStripe,
  travelRadius,
  deviceCount,
}: {
  hasStripe: boolean;
  travelRadius: number | null;
  deviceCount: number;
}) {
  const [pushPerm, setPushPerm] = React.useState<Permission>('default');
  const [pushDevices, setPushDevices] = React.useState(deviceCount);
  const [locPerm, setLocPerm] = React.useState<Permission>('default');
  const [busy, setBusy] = React.useState<string | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    setPushPerm(
      typeof Notification === 'undefined' ? 'unsupported' : (Notification.permission as Permission),
    );
    if (!navigator.permissions?.query) return;
    navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((s) => setLocPerm(s.state as Permission))
      .catch(() => setLocPerm('default'));
  }, []);

  async function enablePush() {
    setBusy('push');
    setMsg(null);
    try {
      const { registerForPush } = await import('@urban-assist/integrations/firebase/push-client');
      const outcome = await registerForPush();
      setPushPerm(
        typeof Notification === 'undefined' ? 'unsupported' : (Notification.permission as Permission),
      );
      if (outcome === 'registered') {
        setPushDevices((n) => n + 1);
        setMsg('Push notifications enabled on this device.');
      } else if (outcome === 'denied') {
        setMsg('Your browser blocked notifications. Allow them in site settings to turn this on.');
      } else {
        setMsg('Push is not available in this browser.');
      }
    } finally {
      setBusy(null);
    }
  }

  async function disablePush() {
    setBusy('push');
    setMsg(null);
    try {
      // Browser permission cannot be revoked from script; removing the tokens is the
      // real off-switch, since the dispatcher has nowhere left to send.
      const res = await fetch('/api/fcm-token', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setPushDevices(0);
        setMsg('Push notifications turned off for all your devices.');
      } else {
        setMsg('Could not turn off push. Try again.');
      }
    } finally {
      setBusy(null);
    }
  }

  async function shareLocation() {
    setBusy('loc');
    setMsg(null);
    const ok = await postCurrentLocation();
    setLocPerm(ok ? 'granted' : 'denied');
    setMsg(
      ok
        ? 'Location updated. Jobs near you will be matched more accurately.'
        : 'Could not read your location. Check the location permission for this site.',
    );
    setBusy(null);
  }

  return (
    <div className="space-y-5 py-2">
      <header>
        <h1 className="font-display text-xl uppercase font-bold text-ink tracking-tight">
          Settings
        </h1>
      </header>

      {msg && <p className="text-xs text-ink bg-bg/60 rounded-xl px-3 py-2">{msg}</p>}

      {/* Notifications */}
      <Card className="!p-4 bg-white space-y-3">
        <Row icon={<Bell className="h-4 w-4" />} title="Push notifications">
          {pushDevices > 0 ? (
            <Badge tone="success">On · {pushDevices} device{pushDevices === 1 ? '' : 's'}</Badge>
          ) : (
            <Badge tone="muted">Off</Badge>
          )}
        </Row>
        <p className="text-xs text-muted">
          Job offers expire in 90 seconds. With push off you will only see them while the app is
          open.
        </p>
        {pushPerm === 'unsupported' ? (
          <p className="text-xs text-muted">This browser does not support push notifications.</p>
        ) : pushDevices > 0 ? (
          <Button variant="outline" size="sm" onClick={disablePush} disabled={busy === 'push'}>
            {busy === 'push' ? 'Working…' : 'Turn off'}
          </Button>
        ) : (
          <Button size="sm" onClick={enablePush} disabled={busy === 'push'}>
            {busy === 'push' ? 'Working…' : 'Turn on for this device'}
          </Button>
        )}
      </Card>

      {/* Location */}
      <Card className="!p-4 bg-white space-y-3">
        <Row icon={<MapPin className="h-4 w-4" />} title="Location">
          <Badge tone={locPerm === 'granted' ? 'success' : 'muted'}>
            {locPerm === 'granted' ? 'Allowed' : locPerm === 'denied' ? 'Blocked' : 'Not set'}
          </Badge>
        </Row>
        <p className="text-xs text-muted">
          Used to match you with nearby jobs and to show customers your position when you are on the
          way. Shared only while you are working.
        </p>
        <Button variant="outline" size="sm" onClick={shareLocation} disabled={busy === 'loc'}>
          {busy === 'loc' ? 'Updating…' : 'Update my location now'}
        </Button>
      </Card>

      {/* Work area */}
      <LinkRow
        href="/settings/service-areas"
        icon={<MapPin className="h-4 w-4" />}
        title="Where you work"
        detail={
          travelRadius ? `${travelRadius} mile radius · postcode areas` : 'Set your postcode areas'
        }
      />

      {/* Payouts */}
      <LinkRow
        href="/earnings"
        icon={<CreditCard className="h-4 w-4" />}
        title="Payouts"
        detail={hasStripe ? 'Bank account connected' : 'Not set up yet'}
        tone={hasStripe ? undefined : 'attention'}
      />

      {/* Help */}
      <LinkRow
        href="/help"
        icon={<LifeBuoy className="h-4 w-4" />}
        title="Help & support"
        detail="FAQs and contacting us"
      />

      {/* Legal — deliberately not inventing copy. */}
      <Card className="!p-4 bg-white space-y-2">
        <Row icon={<FileText className="h-4 w-4" />} title="Legal" />
        <p className="text-xs text-muted">
          The partner terms, privacy policy and code of conduct are not published in the app yet.
          Ask support for the current documents and we will send them to you.
        </p>
      </Card>

      <div className="pt-2 text-center">
        <p className="font-mono-utility text-[10px] uppercase tracking-wider text-muted">
          Urban Assist Pro
        </p>
        <p className="text-[10px] text-muted mt-0.5">
          Version {process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0'}
        </p>
      </div>
    </div>
  );
}

function Row({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="text-muted">{icon}</span>
        <span className="text-sm font-semibold text-ink">{title}</span>
      </div>
      {children}
    </div>
  );
}

function LinkRow({
  href,
  icon,
  title,
  detail,
  tone,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  detail?: string;
  tone?: 'attention';
}) {
  return (
    <Link href={href} className="tap block">
      <Card className="!p-4 bg-white flex items-center justify-between gap-3 transition hover:border-ink">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-muted shrink-0">{icon}</span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-ink">{title}</div>
            {detail && (
              <div className={`text-xs truncate ${tone === 'attention' ? 'text-danger' : 'text-muted'}`}>
                {detail}
              </div>
            )}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted shrink-0" />
      </Card>
    </Link>
  );
}
