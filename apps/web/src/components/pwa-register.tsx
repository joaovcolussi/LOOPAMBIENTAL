'use client';

import { useEffect } from 'react';

// Registers the service worker in production builds only, so local
// development never serves stale bundles.
export function PwaRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== 'production' ||
      !('serviceWorker' in navigator)
    )
      return;
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }, []);
  return null;
}
