'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Bell, Check, Recycle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api, Notification } from '../../../lib/api';
import { SessionActions } from '../../../components/session-actions';

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api
      .notifications()
      .then(({ notifications: result }) => setNotifications(result))
      .catch(() => router.replace('/entrar'))
      .finally(() => setLoading(false));
  }, [router]);
  async function read(id: string) {
    await api.readNotification(id);
    setNotifications((current) =>
      current.map((item) =>
        item.id === id ? { ...item, readAt: new Date().toISOString() } : item,
      ),
    );
  }
  async function readAll() {
    await api.readAllNotifications();
    setNotifications((current) =>
      current.map((item) => ({
        ...item,
        readAt: item.readAt || new Date().toISOString(),
      })),
    );
  }
  if (loading)
    return (
      <main className="dashboard-page">
        <div className="dashboard-loading">Carregando notificações...</div>
      </main>
    );
  return (
    <main className="dashboard-page">
      <nav className="dashboard-nav shell">
        <a className="brand" href="/">
          <Recycle size={21} /> LOOP <span>AMBIENTAL</span>
        </a>
        <div className="dashboard-nav-actions">
          <a className="back-link" href="/dashboard">
            <ArrowLeft size={15} /> Voltar ao painel
          </a>
          <SessionActions mode="dashboard" />
        </div>
      </nav>
      <section className="dashboard-content shell">
        <div className="notification-heading">
          <div>
            <p className="eyebrow">central de atualizações</p>
            <h1>Notificações</h1>
          </div>
          <button className="read-all" onClick={readAll}>
            <Check size={15} /> Marcar todas como lidas
          </button>
        </div>
        {notifications.length === 0 ? (
          <div className="empty-panel favorite-empty">
            <Bell size={22} />
            <p>Nenhuma notificação por enquanto.</p>
          </div>
        ) : (
          <div className="notification-list">
            {notifications.map((notification) => (
              <button
                className={
                  notification.readAt
                    ? 'notification-item read'
                    : 'notification-item'
                }
                key={notification.id}
                onClick={() => !notification.readAt && read(notification.id)}
              >
                <Bell size={18} />
                <span>
                  <strong>{notification.title}</strong>
                  <small>{notification.body}</small>
                  <time>
                    {new Date(notification.createdAt).toLocaleString('pt-BR')}
                  </time>
                </span>
                {!notification.readAt && <i />}
              </button>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
