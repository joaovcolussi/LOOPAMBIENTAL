'use client';

import { Recycle } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { SessionActions } from './session-actions';

const links = [
  { href: '/admin', label: 'Painel' },
  { href: '/admin/usuarios', label: 'Usuários' },
  { href: '/admin/empresas', label: 'Empresas' },
  { href: '/admin/anuncios', label: 'Anúncios' },
  { href: '/admin/moderacao', label: 'Moderação' },
  { href: '/admin/verificacoes', label: 'Verificações' },
  { href: '/admin/denuncias', label: 'Denúncias' },
  { href: '/admin/assinaturas', label: 'Assinaturas' },
  { href: '/admin/pagamentos', label: 'Pagamentos' },
  { href: '/admin/auditoria', label: 'Auditoria' },
  { href: '/admin/carrossel', label: 'Carrossel' },
  { href: '/admin/configuracoes', label: 'Configurações' },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <>
      <nav className="dashboard-nav shell">
        <a className="brand" href="/">
          <Recycle size={21} /> LOOP <span>AMBIENTAL</span>
        </a>
        <div className="dashboard-nav-actions">
          <a className="back-link" href="/dashboard">
            Painel do usuário
          </a>
          <SessionActions mode="dashboard" />
        </div>
      </nav>
      <div className="admin-tabs shell" aria-label="Seções administrativas">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className={pathname === link.href ? 'active' : ''}
            aria-current={pathname === link.href ? 'page' : undefined}
          >
            {link.label}
          </a>
        ))}
      </div>
    </>
  );
}
