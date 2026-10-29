'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useId, useTransition } from 'react';
import { isLocale, LOCALE_COOKIE, localeNames, locales } from '../i18n/config';

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const t = useTranslations('language');
  const locale = useLocale();
  const router = useRouter();
  const id = useId();
  const [pending, startTransition] = useTransition();

  function change(value: string) {
    if (!isLocale(value)) return;
    document.cookie = `${LOCALE_COOKIE}=${value}; Path=/; Max-Age=31536000; SameSite=Lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div className="language-switcher">
      <label htmlFor={id} className={compact ? 'sr-only' : undefined}>
        {t('label')}
      </label>
      <select
        id={id}
        value={locale}
        disabled={pending}
        onChange={(event) => change(event.target.value)}
      >
        {locales.map((value) => (
          <option key={value} value={value}>
            {localeNames[value]}
          </option>
        ))}
      </select>
      {!compact && <small className="form-hint">{t('hint')}</small>}
    </div>
  );
}
