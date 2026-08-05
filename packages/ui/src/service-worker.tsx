'use client';

import * as React from 'react';

/**
 * Registers /sw.js so the app is installable and its static assets are cached.
 *
 * The file existed in both apps' public/ for months and was never registered, so
 * neither PWA met Chrome's install criteria and the "add to home screen" prompt
 * never appeared. Registration is deferred to `load` so it never competes with
 * the first render.
 */
export function ServiceWorkerRegistrar() {
  React.useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* install-ability is an enhancement; the app works without it */
      });
    };
    if (document.readyState === 'complete') register();
    else {
      window.addEventListener('load', register);
      return () => window.removeEventListener('load', register);
    }
  }, []);
  return null;
}
