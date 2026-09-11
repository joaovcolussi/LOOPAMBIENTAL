'use client';

import { FormEvent, useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { api, Conversation, Message } from '../lib/api';

export function ProposalConversation({ proposalId }: { proposalId: string }) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api
      .conversations()
      .then(({ conversations }) => {
        if (!active) return;
        const match = conversations.find(
          (item) => item.proposalId === proposalId,
        );
        setConversation(match ?? null);
        if (match) return api.messages(match.id);
        return null;
      })
      .then((result) => {
        if (active && result) setMessages(result.messages);
      })
      .catch(() => active && setError('Não foi possível carregar a conversa.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [proposalId]);

  async function startConversation() {
    setError('');
    setLoading(true);
    try {
      const result = await api.createConversation(proposalId);
      setConversation(result.conversation);
      setMessages([]);
    } catch {
      setError('Somente participantes responsáveis podem iniciar a conversa.');
    } finally {
      setLoading(false);
    }
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!conversation || !body.trim()) return;
    setSending(true);
    setError('');
    try {
      const result = await api.sendMessage(conversation.id, body);
      setMessages((current) => [...current, result.message]);
      setBody('');
    } catch {
      setError('Não foi possível enviar a mensagem.');
    } finally {
      setSending(false);
    }
  }

  if (loading) return <p className="form-note">Carregando conversa...</p>;
  if (!conversation)
    return (
      <div className="proposal-conversation-empty">
        <MessageCircle size={22} />
        <p>Use a conversa para alinhar condições desta proposta.</p>
        {error && <p className="form-error">{error}</p>}
        <button
          className="button small"
          type="button"
          onClick={startConversation}
        >
          Iniciar conversa
        </button>
      </div>
    );

  return (
    <section className="conversation-panel proposal-conversation">
      <div className="conversation-header">
        <strong>Conversa desta proposta</strong>
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
      {error && <p className="form-error">{error}</p>}
      <form className="message-form" onSubmit={send}>
        <input
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Escreva uma mensagem sobre a proposta..."
          maxLength={5000}
          aria-label="Mensagem"
        />
        <button className="button small" disabled={sending}>
          {sending ? 'Enviando...' : 'Enviar'}
        </button>
      </form>
    </section>
  );
}
