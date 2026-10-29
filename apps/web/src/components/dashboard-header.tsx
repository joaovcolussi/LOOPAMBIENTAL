'use client';

import { ArrowLeft, Recycle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SessionActions } from './session-actions';

type DashboardHeaderProps = {
  backHref?: string;
  backLabel?: string;
};

export function DashboardHeader({
  backHref = '/dashboard',
  backLabel,
}: DashboardHeaderProps) {
  const t = useTranslations('dashboardHeader');
  return (
    <nav className="dashboard-nav shell">
      <a className="brand" href="/">
        <Recycle size={21} /> LOOP <span>AMBIENTAL</span>
      </a>
      <div className="dashboard-nav-actions">
        <a className="back-link" href={backHref}>
          <ArrowLeft size={15} /> {backLabel ?? t('back')}
        </a>
        <SessionActions mode="dashboard" />
      </div>
    </nav>
  );
}
