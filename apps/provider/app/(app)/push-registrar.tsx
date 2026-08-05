'use client';

import { useEffect } from 'react';

/**
 * Re-registers this browser for web push — only when permission was already
 * granted on a previous, deliberate opt-in.
 *
 * It used to call registerForPush() on mount, which fires the browser's
 * permission prompt with no user gesture: Safari and Firefox refuse it outright,
 * and Chrome shows a modal the provider never asked for, the most reliable way
 * to get "Block" clicked forever. The opt-in now lives on an explicit control in
 * settings; this component only keeps an existing subscription alive (tokens
 * rotate, and a stale token means missed job offers).
 */
export function PushRegistrar() {
  useEffect(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    import('@urban-assist/integrations/firebase/push-client')
      .then((m) => m.registerForPush())
      .catch(() => {});
  }, []);
  return null;
}
