'use client';

import { useEffect, useState } from 'react';
import { api, PlatformSettingItem } from '../../../lib/api';
import { AdminNav } from '../../../components/admin-nav';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettingItem[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savedKey, setSavedKey] = useState('');
  const [savingKey, setSavingKey] = useState('');

  useEffect(() => {
    api
      .adminSettings()
      .then(({ settings: result }) => {
        setSettings(result);
        setValues(
          Object.fromEntries(
            result.map((setting) => [setting.key, String(setting.value)]),
          ),
        );
      })
      .catch(() =>
        setError(
          'Acesso restrito ou não foi possível carregar as configurações.',
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  async function save(setting: PlatformSettingItem) {
    setSavingKey(setting.key);
    setError('');
    setSavedKey('');
    try {
      const value =
        setting.type === 'number'
          ? Number(values[setting.key])
          : values[setting.key];
      await api.updateAdminSetting(setting.key, value);
      setSavedKey(setting.key);
    } catch {
      setError(`Não foi possível salvar "${setting.label}".`);
    } finally {
      setSavingKey('');
    }
  }

  if (loading)
    return (
      <main className="dashboard-page">
        <AdminNav />
        <div className="dashboard-loading">Carregando configurações...</div>
      </main>
    );

  return (
    <main className="dashboard-page">
      <AdminNav />
      <section className="dashboard-content shell">
        <p className="eyebrow">administração</p>
        <h1>Configurações</h1>
        <p className="dashboard-lede">
          Parâmetros operacionais da plataforma. Toda alteração é registrada na
          auditoria.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="admin-panel">
          {settings.map((setting) => (
            <div className="admin-setting-row" key={setting.key}>
              <label htmlFor={`setting-${setting.key}`}>{setting.label}</label>
              <small>{setting.description}</small>
              {setting.type === 'string' &&
              setting.key === 'platform_announcement' ? (
                <textarea
                  id={`setting-${setting.key}`}
                  value={values[setting.key] ?? ''}
                  rows={3}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      [setting.key]: event.target.value,
                    }))
                  }
                />
              ) : (
                <input
                  id={`setting-${setting.key}`}
                  type={setting.type === 'number' ? 'number' : 'text'}
                  value={values[setting.key] ?? ''}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      [setting.key]: event.target.value,
                    }))
                  }
                />
              )}
              <div className="moderation-actions">
                <button
                  className="button small"
                  type="button"
                  disabled={savingKey === setting.key}
                  onClick={() => save(setting)}
                >
                  {savingKey === setting.key ? 'Salvando...' : 'Salvar'}
                </button>
                {savedKey === setting.key && <span>Salvo.</span>}
              </div>
            </div>
          ))}
          {settings.length === 0 && (
            <div className="empty-panel">Nenhuma configuração disponível.</div>
          )}
        </div>
      </section>
    </main>
  );
}
