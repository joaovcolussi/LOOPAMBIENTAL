'use client';

import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { api } from '../../lib/api';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api
      .me()
      .then(() => setChecking(false))
      .catch(() => router.replace(`/entrar?next=${pathname}`));
  }, [pathname, router]);

  if (checking)
    return (
      <main className="dashboard-page">
        <div className="dashboard-loading">Verificando sua sessão...</div>
      </main>
    );

  return children;
}
