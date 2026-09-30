# LOOP AMBIENTAL

Marketplace B2B para compra e venda de resíduos, recicláveis, sucatas, subprodutos e materiais reaproveitáveis.

> O resíduo de uma indústria pode ser o insumo estratégico de outra.

---

## 1. Proposta de valor

A LOOP AMBIENTAL conecta empresas geradoras de resíduos a compradores, recicladores, transportadores e operadores homologados. Em vez de tratar excedentes como custo de descarte, a plataforma transforma esse material em ativo comercializável, com contexto suficiente para negociar com segurança.

Ganhos esperados para a cadeia:

- menos descarte e menos transporte sem destino comercial;
- nova receita a partir de subprodutos e recicláveis;
- acesso a fornecedores e compradores fora do círculo geográfico imediato;
- negociação organizada, com histórico e rastreabilidade;
- decisão baseada em dados técnicos, localização e disponibilidade.

---

## 2. Quem usa a plataforma

| Perfil | O que faz |
| --- | --- |
| Visitante | Explora o mercado, categorias e empresas sem conta. |
| Usuário autenticado | Gerencia conta, favoritos e notificações. |
| Membro de empresa | Participa das operações da empresa. |
| Administrador de empresa | Gerencia dados, membros, documentos e anúncios. |
| Comprador | Publica demanda (`BUY`) e envia propostas. |
| Vendedor/Gerador | Publica oferta (`SELL`) de resíduos e subprodutos. |
| Transportador | Cotação e execução logística. |
| Operador/Reciclador | Compra material para reprocessamento. |
| Moderador | Analisa anúncios, documentos e denúncias. |
| Administrador da plataforma | Opera contas, assinaturas, pagamentos e auditoria. |
| Suporte / Financeiro | Atendimento e conciliação. |

Um mesmo usuário pode participar de várias empresas, com papéis diferentes.

---

## 3. Domínio do marketplace

### 3.1 Anúncios

- `BUY`: a empresa quer comprar um material.
- `SELL`: a empresa quer vender um material.

Ciclo de vida:

```
DRAFT → PENDING_REVIEW → PUBLISHED → NEGOTIATING → CLOSED
                                   ↘ PAUSED / EXPIRED / REJECTED / ARCHIVED
```

Regras:

- só anúncios `PUBLISHED` aparecem na busca pública;
- materiais perigosos ou regulados exigem documentação e moderação adicional;
- alterações críticas em anúncio publicado retornam para revisão;
- anúncio encerrado não recebe novas propostas;
- exclusão é lógica quando há histórico comercial.

### 3.2 Propostas

```
PENDING → COUNTERED → ACCEPTED / REJECTED / CANCELLED / EXPIRED
```

Toda proposta aceita cria uma negociação (`deal`), com histórico imutável de contrapropostas.

### 3.3 Negociação

```
OPEN → AWAITING_DOCUMENTS → AWAITING_PAYMENT → AWAITING_PICKUP
     → IN_TRANSIT → DELIVERED → COMPLETED
     ↘ DISPUTED / CANCELLED
```

### 3.4 Mensagens

Conversas vinculadas a anúncio, proposta ou negociação, com participantes por usuário/empresa e anexos privados.

### 3.5 Logística

Solicitação de transporte, cotações de transportadores e acompanhamento da coleta/entrega.

### 3.6 Reputação e moderação

Avaliações após negociação elegível, denúncias, fila de moderação e histórico de ações administrativas.

---

## 4. Catálogo de resíduos

Categorias hierárquicas com materiais e atributos técnicos pesquisáveis:

- plástico, papel e papelão, metais, vidro, madeira, borracha;
- orgânicos, têxteis, eletroeletrônicos;
- construção e demolição, químicos, óleo usado, sucata geral;
- resíduos perigosos e outros.

Atributos por categoria: cor, pureza, composição, granulometria, umidade, contaminação, estado físico, tipo de embalagem e certificação.

---

## 5. Funcionalidades

### Conta e acesso
- cadastro, login e sessão segura em cookie `HttpOnly`;
- verificação de e-mail e recuperação de senha;
- senha com hash forte (scrypt);
- auditoria de login e expiração de sessão.

### Empresas
- cadastro e edição de perfil;
- membros com papéis (proprietário, administrador, membro);
- endereço e contatos com visibilidade controlada;
- CNPJ criptografado + hash normalizado para unicidade;
- documentos e verificação de empresa.

### Anúncios
- criação de compra/venda com dados técnicos, quantidade, preço e frequência;
- fotos com validação de conteúdo e limite;
- publicação com moderação;
- busca e filtros;
- favoritos.

### Negociação
- propostas, contrapropostas e histórico de revisões;
- negociação criada ao aceitar;
- mensagens por conversa;
- notificações;
- pagamento com idempotência;
- solicitação de logística e cotações.

### Administração
- painel com KPIs e gráficos;
- moderação de anúncios;
- verificação de empresas;
- gestão de usuários e papéis;
- curadoria do carrossel da home;
- auditoria.

### Plataforma
- planos e assinaturas;
- desbloqueio de contato;
- relatórios ambientais e comerciais;
- alertas de buscas salvas.

---

## 6. Modelo comercial

- comissão por operação concluída (faixa de 5% a 15%);
- planos de assinatura com limites e recursos premium;
- desbloqueio de contato como crédito avulso ou benefício de plano.

---

## 7. Privacidade, segurança e conformidade

- princípio do menor privilégio;
- criptografia de dados sensíveis;
- TLS, CSP, HSTS, cookies `Secure`/`HttpOnly`/`SameSite`;
- proteção contra XSS, CSRF, SSRF e SQL injection;
- rate limiting por IP, usuário e empresa;
- uploads com allowlist, validação de MIME por conteúdo e nomes aleatórios;
- URLs assinadas e curtas para arquivos privados;
- logs redigidos, sem PII desnecessária;
- LGPD: consentimento, exportação, correção, anonimização e exclusão quando aplicável;
- políticas e termos versionados com registro de aceite.

---

## 8. Stack técnica

- **Monorepo:** Node.js LTS, TypeScript strict, pnpm workspaces, Turborepo, ESLint, Prettier, Conventional Commits.
- **Frontend:** Next.js (App Router), React, Tailwind/shadcn (planejado), TanStack Query (planejado), Zustand para UI, next-intl, Lucide, Recharts, Playwright/Vitest.
- **Backend:** NestJS, REST versionada (`/api/v1`), OpenAPI, Prisma, MySQL 8.4, Redis, BullMQ, WebSocket/SSE, S3 compatível, adapters de e-mail, pagamento e mapas.
- **Infra:** Docker Compose (MySQL, Redis, MinIO, Mailpit, API, Web, Worker) e ambientes local/test/staging/production.

---

## 9. Princípios de produto

1. Segurança e privacidade antes de velocidade.
2. Integridade dos dados e das negociações.
3. Interface B2B confiável, densa e objetiva.
4. Mobile-first e acessível (WCAG AA).
5. Sem copiar concorrentes: referência apenas funcional.
6. Evoluir de forma incremental, sem microserviços ou IA prematuros.

---

## 10. Onde estamos

O núcleo do marketplace já funciona de ponta a ponta: cadastro/login, empresas, catálogo, anúncios com fotos, moderação, propostas/negociações, mensagens, notificações, favoritos, logística, pagamentos (adapter) e painel administrativo completo. A busca pública usa índice `FULLTEXT` com ranking e facetas, e tarefas assíncronas (e-mails e eventos de domínio) passam por um transactional outbox processado pelo worker com BullMQ.

O detalhamento do que está pronto, em andamento e pendente está em [`desenvolvimento.md`](./desenvolvimento.md).
