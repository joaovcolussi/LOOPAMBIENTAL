'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardHeader } from '../../../components/dashboard-header';
import { MfaSection } from '../../../components/account/mfa-section';
import { PasswordSection } from '../../../components/account/password-section';
import { PrivacySection } from '../../../components/account/privacy-section';
import { ProfileSection } from '../../../components/account/profile-section';
import { SessionsSection } from '../../../components/account/sessions-section';
import { LanguageSwitcher } from '../../../components/language-switcher';
import { AccountProfile, api, isAuthenticationError } from '../../../lib/api';

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { user } = await api.account();
    setProfile(user);
  }, []);

  useEffect(() => {
    load().catch((caught) => {
      if (isAuthenticationError(caught)) {
        router.replace('/entrar?next=/dashboard/configuracoes');
        return;
      }
      setError('Não foi possível carregar suas configurações.');
    });
  }, [load, router]);

  return (
    <main className="dashboard-page">
      <DashboardHeader />
      <section className="dashboard-content shell">
        <p className="eyebrow">conta</p>
        <h1>Configurações</h1>
        <p className="dashboard-lede">
          Dados pessoais, segurança de acesso e privacidade.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {!profile && !error && (
          <div className="dashboard-loading">Carregando configurações...</div>
        )}
        {profile && (
          <div className="settings-grid">
            <ProfileSection profile={profile} onChange={setProfile} />
            <PasswordSection />
            <MfaSection profile={profile} onChanged={() => void load()} />
            <SessionsSection />
            <section className="admin-panel" aria-labelledby="language-title">
              <h2 id="language-title">Idioma</h2>
              <LanguageSwitcher />
            </section>
            <PrivacySection profile={profile} onChange={setProfile} />
          </div>
        )}
      </section>
    </main>
  );
}
