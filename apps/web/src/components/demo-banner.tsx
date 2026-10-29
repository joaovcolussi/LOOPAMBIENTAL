import { useTranslations } from 'next-intl';

const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';

// Visible on every page while the platform runs as a study/demo environment,
// so nobody mistakes simulated payments or fictitious data for real ones.
export function DemoBanner() {
  const t = useTranslations('demo');
  if (!demoMode) return null;
  return (
    <div className="demo-banner" role="note">
      <strong>{t('title')}</strong> {t('body')}
    </div>
  );
}
