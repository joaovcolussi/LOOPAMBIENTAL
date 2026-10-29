# Desenvolvimento — LOOP AMBIENTAL

Documento vivo de acompanhamento. Legenda:

- ✅ Concluído
- 🔄 Em andamento
- ⬜ Pendente
- ⚠️ Parcial / com ressalva

Última atualização: ciclo atual de implementação.

---

## 1. Rodada atual — todas as pendências (ambiente de demonstração)

✅ **Plataforma completa para estudo/demonstração**

- [x] Modo demonstração: aviso em todas as páginas, `pnpm db:demo` com dados fictícios e `PAYMENT_PROVIDER=simulated`
- [x] Cobrança real de assinaturas/desbloqueios via adapter de pagamento (checkout simulado em `/pagamento-simulado/[id]`, liquidação única e idempotente)
- [x] Negociações: máquina de estados explícita (`/deals/:id/<ação>`), disputas resolvidas pelo admin, devolução de estoque; páginas `/dashboard/negociacoes`
- [x] Verificação de e-mail obrigatória para login (`REQUIRE_EMAIL_VERIFICATION`) e reenvio
- [x] MFA (TOTP + códigos de recuperação), opcionalmente obrigatório para admin (`REQUIRE_ADMIN_MFA`)
- [x] LGPD: aceite versionado de termos/privacidade, exportação de dados, anonimização de conta, registro em `/admin/lgpd`
- [x] `/dashboard/configuracoes` e `/dashboard/anuncios/[id]/editar`
- [x] Tempo real (SSE) para mensagens e notificações
- [x] Observabilidade: logs JSON, `requestId` + `traceparent`, métricas Prometheus, liveness/readiness, `/admin/observabilidade`
- [x] CSP/headers de segurança na API e no web
- [x] Tabela `files` e varredura de uploads por adapter (EICAR, executáveis, PDF com conteúdo ativo)
- [x] Paginação por cursor (propostas, meus anúncios, notificações, negociações) e limites nas demais listas; KPIs do admin agregados no banco
- [x] `prompt`/`confirm` substituídos pelo `ConfirmDialog` (hook `useConfirm`)
- [x] Atributos de material (`material_attributes`, `listing_attributes`) com filtro na busca
- [x] Relatórios comerciais e ambientais (`/dashboard/relatorios`, CSV)
- [x] Logística avançada: remessas, eventos de rastreio, cotações simuladas, `/admin/logistica`
- [x] Integrações ERP: chaves de API, endpoints `X-Api-Key`, importação/exportação CSV (`/dashboard/integracoes`, `/desenvolvedores`)
- [x] Recomendação de ofertas explicável (`/dashboard/recomendacoes`)
- [x] Aplicativo móvel como PWA instalável (manifest, service worker, página offline)
- [x] i18n com next-intl (pt-BR, en, es) — ⚠️ cobre home, banner e navegação; demais telas seguem em pt-BR

### Ressalvas conhecidas
- ⚠️ Tempo real em memória (uma instância); várias instâncias exigem Redis pub/sub.
- ⚠️ Varredura de uploads por assinaturas e síncrona; produção deve plugar antivírus real (ClamAV) no adapter, de preferência no worker.
- ⚠️ Fatores de CO₂e ilustrativos, não certificados.
- ⚠️ Stack frontend ainda diverge do planejado (Tailwind/shadcn, TanStack Query, Recharts); mantida para não reescrever as telas.

---

## 1.0 Rodada anterior

### Revisão geral

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
- ✅ Pagamentos: adapters Mercado Pago e simulado, com chave de idempotência

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
- ✅ Relatórios ambientais e comerciais
- ✅ Geolocalização avançada (coordenadas indexadas, filtro por distância e ordenação)
- ✅ Atributos de material (`material_attributes`, `listing_attributes`)

### 3.3 Fase 3
- ✅ Logística avançada (shipments, rastreio)
- ✅ Integrações ERP (API key + CSV)
- ✅ Recomendação de ofertas
- ✅ API pública (`/integrations`, docs em `/desenvolvedores`)
- ✅ Aplicativo móvel (PWA instalável)

---

## 4. Infraestrutura e qualidade

- ✅ CI (`.github/workflows/ci.yml`): lint, typecheck, testes, build e job E2E com MySQL/Redis
- ✅ Filas com BullMQ + Redis e transactional outbox (`outbox_events`)
- ✅ Worker processando o outbox (e-mail de verificação, negociação e pagamento) com retry/backoff
- ✅ E2E com Playwright (fluxo completo + smoke) e testes unitários do frontend (Vitest)
- ✅ Rate limiting global e em pontos sensíveis de autenticação (`@nestjs/throttler`)
- ✅ Tempo real (SSE) para mensagens e notificações
- ⚠️ Scanner de malware (adapter por assinaturas, síncrono) e tabela `files`
- ✅ MFA (obrigatório para admin via `REQUIRE_ADMIN_MFA`)
- ✅ Observabilidade: logs estruturados, métricas, correlação de traces (alertas externos pendentes)
- ✅ Ferramentas LGPD (exportação, anonimização, aceite versionado)
- ⚠️ i18n com next-intl (páginas públicas principais)
- ⚠️ Stack frontend divergente do planejado (Tailwind/shadcn/Radix, React Hook Form, Zod, TanStack Query, Zustand, Recharts, MapLibre)

---

## 5. Próximos passos sugeridos

1. Redis pub/sub para SSE com várias instâncias da API.
2. Antivírus real (ClamAV) no adapter de varredura, executado pelo worker.
3. Traduzir o restante das telas autenticadas.
4. Migrar o frontend gradualmente para a stack planejada (Tailwind/shadcn, TanStack Query).

## 6. Notas de implementação

- **Busca FULLTEXT**: o índice `listings_search_fulltext(title, description)` é criado por migration (SQL), pois o Prisma não representa índices `FULLTEXT`. A busca usa `MATCH ... AGAINST` com ranking e facetas; paginação por cursor (rank inteiro + `published_at` + `id`) e ordenação por relevância quando há termo.
- **Transactional outbox**: eventos são gravados na mesma transação do domínio (`outbox_events`). O worker consome via BullMQ (`REDIS_URL`) ou por polling quando o Redis não está configurado. Handlers atuais: `company.verification.approved`, `company.verification.rejected`, `deal.created`, `payment.confirmed`.
- **Assinaturas e contato**: ativação/cancelamento self-service em `/dashboard/assinatura`; o plano define a quota `features.contactUnlocks` (`-1` = ilimitado). O desbloqueio de contato é idempotente por `(company, listing)` e a visibilidade do contato em anúncios não públicos depende de um desbloqueio da empresa do usuário.
- **Avaliações**: uma avaliação por empresa/negociação, liberada após `COMPLETED`; `rating_average`/`rating_count` são recalculados na mesma transação do `review`. A reputação é pública em `/companies/:slug/reviews`.
- **Geolocalização**: `latitude`/`longitude` (Decimal 10,7) em empresas e anúncios. A busca por raio usa pré-filtro por bounding box com índice `(latitude, longitude)` e refinamento por `ST_Distance_Sphere`; a ordenação por distância só é aplicada quando há coordenadas válidas (`sort=distance`).
- **Migrações**: `20260930260000_add_plans_outbox_fulltext`, `20260930270000_add_contact_unlocks`, `20260930280000_add_reviews`, `20260930290000_add_geo_coordinates` e `20260930300000_seed_reference_catalog` (categorias/materiais de referência).
- **Seed**: `pnpm db:demo` (packages/database/src/demo-seed.ts) cria dados fictícios idempotentes; o catálogo e os atributos são dados de referência (migrações). Os testes E2E criam suas próprias contas.
- **Migrações novas**: `20261029090000_demo_platform_features` (cobranças genéricas, MFA, LGPD, files, atributos, remessas, chaves de API) e `20261029091000_seed_material_attributes`.
- **Auditoria**: relatório em `docs/security/auditoria-2026-09.md`.
