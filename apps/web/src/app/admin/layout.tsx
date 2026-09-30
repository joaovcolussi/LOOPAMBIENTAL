'use client';

import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { api } from '../../lib/api';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    api
      .me()
      .then(({ user }) => {
        const privileged =
          user.platformRole === 'ADMIN' || user.platformRole === 'MODERATOR';
        setAllowed(privileged);
        if (!privileged) router.replace('/dashboard');
      })
      .catch(() => router.replace(`/entrar?next=${pathname}`))
      .finally(() => setChecking(false));
  }, [pathname, router]);

  if (checking)
    return (
      <main className="dashboard-page">
        <div className="dashboard-loading">Verificando seu acesso...</div>
      </main>
    );

  if (!allowed)
    return (
      <main className="dashboard-page">
        <div className="dashboard-loading">Redirecionando...</div>
      </main>
    );

  return children;
}
