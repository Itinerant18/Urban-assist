'use client';

import { useEffect } from 'react';

// Registers this browser for web push once the dashboard mounts.
// ponytail: prompts on mount — fine for Chromium; Firefox/Safari need a user
// gesture and will skip. Add an explicit "Enable notifications" button if those
// browsers matter.
export function PushRegistrar() {
  useEffect(() => {
    import('@urban-assist/integrations/firebase/push-client')
      .then((m) => m.registerForPush())
      .catch(() => {});
  }, []);
  return null;
}
