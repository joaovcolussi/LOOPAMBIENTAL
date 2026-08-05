'use client';

import { useEffect, useState } from 'react';
import { Recycle } from 'lucide-react';
import { api } from '../../lib/api';

export default function VerifyEmailPage() {
  const [status, setStatus] = useState('Verificando seu e-mail...');
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      setStatus('Token de verificação ausente.');
      return;
    }
    api
      .verifyEmail(token)
      .then(() => setStatus('E-mail verificado com sucesso.'))
      .catch(() => setStatus('O link e invalido ou expirou.'));
  }, []);
  return (
    <main className="auth-page">
      <a className="brand auth-brand" href="/">
        <Recycle size={22} /> LOOP <span>AMBIENTAL</span>
      </a>
      <section className="auth-card">
        <p className="eyebrow">verificação</p>
        <h1>{status}</h1>
        <p className="auth-switch">
          <a href="/entrar">Ir para login</a>
        </p>
      </section>
    </main>
  );
}
