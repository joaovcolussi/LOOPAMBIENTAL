'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, MessageCircle, Recycle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  api,
  Conversation,
  isAuthenticationError,
  Message,
} from '../../../lib/api';
import { SessionActions } from '../../../components/session-actions';

export default function MessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    api
      .conversations()
      .then(({ conversations: result }) => {
        setConversations(result);
        if (result[0]) select(result[0]);
      })
      .catch((caught) => {
        if (isAuthenticationError(caught))
          router.replace('/entrar?next=/dashboard/mensagens');
        else
          setError(
            'Não foi possível carregar suas conversas. Tente novamente.',
          );
      })
      .finally(() => setLoading(false));
  }, [router]);
  async function select(conversation: Conversation) {
    setActive(conversation);
    try {
      const result = await api.messages(conversation.id);
      setMessages(result.messages);
      await api.markConversationRead(conversation.id);
    } catch (caught) {
      if (isAuthenticationError(caught))
        router.replace('/entrar?next=/dashboard/mensagens');
      else setError('Não foi possível carregar esta conversa.');
    }
  }
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!active || !body.trim()) return;
    setSending(true);
    setError('');
    try {
      const result = await api.sendMessage(active.id, body);
      setMessages((current) => [...current, result.message]);
      setBody('');
    } catch {
      setError('Não foi possível enviar a mensagem.');
    } finally {
      setSending(false);
    }
  }
  if (loading)
    return (
      <main className="dashboard-page">
        <div className="dashboard-loading">Carregando mensagens...</div>
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
        <p className="eyebrow">comunicação</p>
        <h1>Mensagens</h1>
        <p className="dashboard-lede">
          Converse com empresas envolvidas nas suas propostas.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {conversations.length === 0 ? (
          <div className="empty-panel favorite-empty">
            <MessageCircle size={22} />
            <p>Nenhuma conversa iniciada.</p>
            <a className="text-link" href="/dashboard/propostas">
              Ver propostas <ArrowRight size={15} />
            </a>
          </div>
        ) : (
          <div className="conversation-layout">
            <aside className="conversation-list">
              {conversations.map((conversation) => (
                <button
                  className={
                    active?.id === conversation.id
                      ? 'conversation-item active'
                      : 'conversation-item'
                  }
                  key={conversation.id}
                  onClick={() => select(conversation)}
                >
                  <strong>{conversation.listing?.title || 'Negociação'}</strong>
                  <small>
                    {conversation.messages[0]?.body || 'Sem mensagens'}
                  </small>
                </button>
              ))}
            </aside>
            <section className="conversation-panel">
              <div className="conversation-header">
                <strong>{active?.listing?.title || 'Conversa'}</strong>
              </div>
              <div className="message-list">
                {messages.length === 0 ? (
                  <p className="message-empty">Envie a primeira mensagem.</p>
                ) : (
                  messages.map((message) => (
                    <div className="message-bubble" key={message.id}>
                      <small>{message.sender.name}</small>
                      <p>{message.body}</p>
                    </div>
                  ))
                )}
              </div>
              <form className="message-form" onSubmit={send}>
                <input
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="Escreva uma mensagem..."
                  maxLength={5000}
                />
                <button className="button" disabled={sending}>
                  {sending ? 'Enviando...' : 'Enviar'}
                </button>
              </form>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
