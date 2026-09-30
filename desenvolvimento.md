# Desenvolvimento — LOOP AMBIENTAL

Documento vivo de acompanhamento. Legenda:

- ✅ Concluído
- 🔄 Em andamento
- ⬜ Pendente
- ⚠️ Parcial / com ressalva

Última atualização: ciclo atual de implementação.

---

## 1. Em andamento nesta rodada

✅ **Revisão geral, testes de operações e melhoria de UI/UX**

- [x] Bloqueador de build corrigido: `absoluteExpiresAt` obrigatório não era gravado em `createSession` (login/cadastro quebravam e `typecheck` falhava)
- [x] Expiração absoluta de sessão efetivamente aplicada (`SESSION_ABSOLUTE_SECONDS`), com teto no refresh deslizante
- [x] Webhook de pagamento idempotente e transacional (sem transição/evento duplicado; settle uma única vez)
- [x] Paginação por cursor do admin não descarta mais o filtro de busca (uso de `AND` em vez de spread de `OR`)
- [x] Cursor da busca por distância corrigido (chave inteira em metros), evitando pular/duplicar resultados
- [x] Edição de anúncio em `NEGOTIATING` não reinfla o estoque reservado (bloqueia quantidade/tipo/preço/categoria)
- [x] Testes de regressão adicionados (sessão absoluta, paginação com busca)
- [x] UI/UX: rótulos centralizados (`lib/labels.ts`) e remoção de enums crus; estados de carregamento nas tabelas do admin; diálogo acessível de confirmação/motivo no lugar de `prompt`/`confirm`; correções de acessibilidade (label de mensagem, `aria-label` do campo de valor); fallback neutro de imagem por categoria; estados de erro/parcial no painel; formulário de anúncio sem empresa e com separador decimal pt-BR

### Próximo planejado
- [ ] Verificação de e-mail obrigatória para login pós-cadastro
- [ ] Cobrança real de assinaturas/desbloqueios: hoje a ativação interna do plano e o desbloqueio avulso não passam pelo adapter de pagamento
- [ ] Scanner de uploads; `helmet` CSP fina; observabilidade (logs estruturados, métricas, traces)
- [ ] Paginação nos demais endpoints de lista; agregados do painel admin no banco (evitar carregar tabelas inteiras)
- [ ] Tempo real (SSE/WebSocket) para mensagens e notificações
- [ ] Rotas previstas em `AGENTS.md` ausentes: `/dashboard/configuracoes` e `/dashboard/anuncios/[id]/editar`
- [ ] Restaurar `prompt`/`confirm` remanescentes em verificações, denúncias, documentos e buscas salvas

---

## 1.1 Rodada anterior

✅ **Seeds removidas, testes completos e auditoria geral**

- [x] Removido `demo-data.ts`/`db:demo`; catálogo (categorias e materiais) vira migração de referência `20260930300000_seed_reference_catalog`
- [x] E2E auto-provisiona contas/empresas (Playwright global setup), sem depender de seed
- [x] Upload de imagens do anúncio confirmado funcional (allowlist, WebP, MinIO, leitura pública) e coberto por E2E
- [x] Fluxo completo validado (conta → empresa → anúncio+imagem → moderação → proposta → negociação → chat) e convertido em `e2e/full-flow.spec.ts`
- [x] Auditoria de segurança e de frontend; correções críticas/altas aplicadas (ver `docs/security/auditoria-2026-09.md`)
- [x] `FIELD_ENCRYPTION_KEY` obrigatória em produção
- [x] Open redirect corrigido no login/cadastro
- [x] Guarda de rota do painel administrativo (`admin/layout.tsx`)
- [x] `ADMIN_EMAILS` só concede privilégio a e-mail verificado
- [x] Rate limiting global + limite agressivo em autenticação (`@nestjs/throttler`)
- [x] Login sem timing oracle; `error.tsx` e `not-found.tsx`; retry real na busca; erros tratados

### Planejado (rodada anterior — ver seção 1 para o status atual)
- [x] Expiração absoluta de sessão (aplicada na rodada atual)
- [x] Modais acessíveis no lugar de `prompt`/`confirm` (parcial — fluxos principais)
- [ ] Verificação de e-mail obrigatória para login pós-cadastro
- [ ] `helmet` (CSP/HSTS); scanner de uploads; erros de formulário associados ao campo
- [ ] Integrar cobrança real de assinaturas/desbloqueios ao adapter de pagamento
- [ ] Tempo real (SSE/WebSocket) para mensagens e notificações

---

## 2. Concluído

### Plataforma e infraestrutura
- ✅ Monorepo pnpm + Turborepo, TypeScript strict, Prettier
- ✅ Docker Compose: MySQL 8.4, Redis, MinIO, Mailpit
- ✅ Prisma + migrações versionadas (`db:migrate`, `db:deploy`, `db:status`)
- ✅ API NestJS com prefixo `/api/v1` e health check
- ✅ Worker como processo separado (stub)

### Conta e acesso
- ✅ Cadastro, login, logout e `GET /auth/me`
- ✅ Sessão em cookie `HttpOnly`, `SameSite=Lax`, expiração deslizante
- ✅ Hash de senha com scrypt e comparação em tempo constante
- ✅ Verificação de e-mail e recuperação/redefinição de senha
- ✅ E-mails transacionais via adapter (Mailpit em dev)
- ✅ Guards de autenticação e de mutação (`x-app-action`)
- ✅ RBAC de plataforma (USER/MODERATOR/ADMIN) e guards admin/moderação

### Empresas
- ✅ Criação, listagem e edição de empresa
- ✅ Membros com papéis OWNER/ADMIN/MEMBER
- ✅ CNPJ criptografado + hash normalizado (unicidade)
- ✅ Visibilidade de contato (PRIVATE/MEMBERS/PUBLIC)
- ✅ Documentos da empresa com storage privado (PDF/imagem) e download autorizado
- ✅ Fluxo de verificação: solicitação, análise e selo de empresa verificada
- ✅ Notificações e auditoria das decisões de verificação
- ✅ Convite de membros por e-mail com aceite por token e expiração
- ✅ Gestão de membros: papéis (proprietário/admin/membro), alteração e remoção

### Denúncias e moderação
- ✅ Denúncias de anúncio, empresa, usuário e mensagem
- ✅ Fila de denúncias no admin com resolver/arquivar e observações
- ✅ Botão de denúncia na página do anúncio

### Rastreabilidade
- ✅ Histórico imutável de status do anúncio (`listing_status_history`)
- ✅ Histórico imutável de status da negociação (`deal_status_history`)
- ✅ Timeline no detalhe do anúncio (proprietário) e da proposta

### Descoberta
- ✅ Buscas salvas (`saved_searches`) com filtros normalizados
- ✅ Alertas por frequência (diário/semanal) com notificação de novos anúncios
- ✅ Página `/dashboard/buscas-salvas` e botão "Salvar busca" na listagem
- ✅ Disparo manual de alertas pelo admin (`/admin/saved-search-alerts/run`)

### Páginas públicas
- ✅ `/planos` com comparativo de planos
- ✅ `/termos` e `/privacidade` (versão de demonstração, revisar com jurídico)
- ✅ `/categorias/[slug]` com anúncios publicados da categoria
- ✅ `/empresas/[slug]` com perfil público e anúncios (slug único por empresa)
- ✅ Links de categoria e empresa nos cards e no detalhe do anúncio

### Catálogo e anúncios
- ✅ Categorias e materiais como dados de referência (migração `seed_reference_catalog`)
- ✅ Criação/edição de anúncios de compra e venda
- ✅ Upload de fotos com sanitização (sharp), limite e hash (MinIO/S3)
- ✅ Ciclo de status com envio para revisão, pausa e encerramento
- ✅ Busca pública por termo/tipo/categoria/estado, com paginação
- ✅ Página pública do anúncio e prévia do proprietário
- ✅ Favoritos

### Negociação
- ✅ Propostas, contrapropostas e histórico de revisões
- ✅ Aceite gera `deal` com reserva de quantidade
- ✅ Conversas e mensagens com contagem de não lidas
- ✅ Notificações in-app (criação, leitura e leitura em massa)
- ✅ Logística: solicitação e cotações (cotações via admin)
- ✅ Pagamentos: adapter Mercado Pago com chave de idempotência

### Moderação e administração
- ✅ Fila de moderação de anúncios (aprovar/rejeitar) com auditoria
- ✅ Painel admin com KPIs e gráficos
- ✅ Gestão de usuários e papéis com auditoria
- ✅ Curadoria do carrossel da home (com versionamento e auditoria)
- ✅ Carrossel de reciclagem na home

### Qualidade
- ✅ Respostas de erro padronizadas com `requestId` e header `X-Request-Id`
- ✅ Testes unitários da API (8 suítes)
- ✅ Script E2E do fluxo completo (auth, anúncios, moderação, propostas, deals, conversas, favoritos, notificações, logística, pagamentos, carrossel)
- ✅ Lint, typecheck e build de produção passando
- ✅ Seed de demonstração com anúncios, propostas, conversas e notificações

---

## 3. Pendente

### 3.1 Fase 1 (MVP)
- ✅ Documentos e verificação de empresa
- ✅ Convite e gestão de membros (`/dashboard/empresa/membros`)
- ✅ Denúncias (`reports`) e moderação de denúncias
- ✅ Buscas salvas + alertas (`saved_searches`)
- ✅ Páginas públicas: `/planos`, `/termos`, `/privacidade`, `/categorias/[slug]`, `/empresas/[slug]`
- ✅ Páginas admin: `/admin/usuarios`, `/admin/empresas`, `/admin/anuncios`, `/admin/denuncias`, `/admin/assinaturas`, `/admin/pagamentos`, `/admin/auditoria`, `/admin/configuracoes`
- ✅ Busca com índice `FULLTEXT`, ranking, facetas e paginação por cursor
- ✅ Histórico de status de anúncio e de negociação

### 3.2 Fase 2
- ✅ Planos e assinaturas self-service (`/dashboard/assinatura`) e desbloqueio de contato (`contact_unlocks`) por benefício de plano (quota) ou avulso — a cobrança real depende do adapter de pagamento
- ✅ Avaliações e reputação (`reviews`) por negociação concluída
- ⬜ Relatórios ambientais e comerciais
- ✅ Geolocalização avançada (coordenadas indexadas, filtro por distância e ordenação)
- ⬜ Atributos de material (`material_attributes`, `listing_attributes`)

### 3.3 Fase 3
- ⬜ Logística avançada (shipments, rastreio)
- ⬜ Integrações ERP
- ⬜ Recomendação de ofertas
- ⬜ API pública
- ⬜ Aplicativo móvel

---

## 4. Infraestrutura e qualidade

- ✅ CI (`.github/workflows/ci.yml`): lint, typecheck, testes, build e job E2E com MySQL/Redis
- ✅ Filas com BullMQ + Redis e transactional outbox (`outbox_events`)
- ✅ Worker processando o outbox (e-mail de verificação, negociação e pagamento) com retry/backoff
- ✅ E2E com Playwright (fluxo completo + smoke) e testes unitários do frontend (Vitest)
- ✅ Rate limiting global e em pontos sensíveis de autenticação (`@nestjs/throttler`)
- ⬜ Tempo real (WebSocket/SSE) para mensagens e notificações
- ⬜ Scanner de malware assíncrono e tabela `files`
- ⬜ MFA (obrigatório para admin)
- ⬜ Observabilidade: logs estruturados, métricas, traces e alertas
- ⬜ Ferramentas LGPD (exportação, exclusão, retenção)
- ⬜ i18n com next-intl
- ⚠️ Stack frontend divergente do planejado (Tailwind/shadcn/Radix, React Hook Form, Zod, TanStack Query, Zustand, Recharts, MapLibre)

---

## 5. Próximos passos sugeridos

1. Integrar cobrança real de assinaturas e desbloqueios ao adapter de pagamento.
2. Tempo real (SSE/WebSocket) para mensagens e notificações.
3. Rate limiting, MFA para administradores e observabilidade.
4. Relatórios ambientais e comerciais.
5. Atributos técnicos de material (`material_attributes`, `listing_attributes`).

## 6. Notas de implementação

- **Busca FULLTEXT**: o índice `listings_search_fulltext(title, description)` é criado por migration (SQL), pois o Prisma não representa índices `FULLTEXT`. A busca usa `MATCH ... AGAINST` com ranking e facetas; paginação por cursor (rank inteiro + `published_at` + `id`) e ordenação por relevância quando há termo.
- **Transactional outbox**: eventos são gravados na mesma transação do domínio (`outbox_events`). O worker consome via BullMQ (`REDIS_URL`) ou por polling quando o Redis não está configurado. Handlers atuais: `company.verification.approved`, `company.verification.rejected`, `deal.created`, `payment.confirmed`.
- **Assinaturas e contato**: ativação/cancelamento self-service em `/dashboard/assinatura`; o plano define a quota `features.contactUnlocks` (`-1` = ilimitado). O desbloqueio de contato é idempotente por `(company, listing)` e a visibilidade do contato em anúncios não públicos depende de um desbloqueio da empresa do usuário.
- **Avaliações**: uma avaliação por empresa/negociação, liberada após `COMPLETED`; `rating_average`/`rating_count` são recalculados na mesma transação do `review`. A reputação é pública em `/companies/:slug/reviews`.
- **Geolocalização**: `latitude`/`longitude` (Decimal 10,7) em empresas e anúncios. A busca por raio usa pré-filtro por bounding box com índice `(latitude, longitude)` e refinamento por `ST_Distance_Sphere`; a ordenação por distância só é aplicada quando há coordenadas válidas (`sort=distance`).
- **Migrações**: `20260930260000_add_plans_outbox_fulltext`, `20260930270000_add_contact_unlocks`, `20260930280000_add_reviews`, `20260930290000_add_geo_coordinates` e `20260930300000_seed_reference_catalog` (categorias/materiais de referência).
- **Seed**: não há dados de demonstração. O catálogo é referência (migração) e os testes E2E criam suas próprias contas/empresas/anúncios via API.
- **Auditoria**: relatório em `docs/security/auditoria-2026-09.md`.
