# AGENTS.md

## 1. Missão do projeto

Construir uma plataforma B2B moderna para compra e venda de resíduos, recicláveis, sucatas, subprodutos e materiais reaproveitáveis.

A aplicação deve conectar empresas geradoras de resíduos a compradores, recicladores, transportadores e operadores homologados, permitindo:

- cadastro e verificação de empresas;
- criação de anúncios de compra e venda;
- busca por material, categoria, localização e disponibilidade;
- negociação por propostas e mensagens;
- favoritos e alertas;
- gestão de documentos e conformidade;
- contratação ou solicitação de logística;
- avaliações e reputação;
- painel administrativo;
- planos de assinatura e recursos premium;
- rastreabilidade das negociações;
- relatórios ambientais e comerciais.

O produto deve ser próprio. Nunca copiar código, textos, imagens, marca, layout ou identidade visual de concorrentes. Sites existentes podem ser usados somente como referência funcional.

---

## 2. Princípios de execução dos agentes

Todos os agentes devem seguir estas regras:

1. Antes de alterar código, analisar:
   - objetivo da tarefa;
   - arquivos afetados;
   - impacto no banco;
   - impacto em autenticação e autorização;
   - impacto em testes;
   - impacto em segurança;
   - compatibilidade com a arquitetura atual.

2. Para tarefas não triviais, apresentar um plano curto antes da implementação.

3. Não inventar bibliotecas, APIs, variáveis de ambiente ou módulos existentes.

4. Sempre inspecionar o código atual antes de criar uma implementação paralela.

5. Preferir alteração incremental e compatível a grandes reescritas.

6. Não remover funcionalidades existentes sem solicitação explícita.

7. Não alterar contratos públicos da API sem:
   - atualizar documentação;
   - atualizar validação;
   - atualizar clientes;
   - criar migração ou estratégia de compatibilidade;
   - atualizar testes.

8. Nunca inserir segredos no código, exemplos, logs, commits ou documentação.

9. Toda funcionalidade deve considerar:
   - estado vazio;
   - carregamento;
   - erro;
   - sucesso;
   - falta de permissão;
   - dados inválidos;
   - concorrência;
   - dispositivos móveis;
   - acessibilidade.

10. Ao concluir uma tarefa, informar:
    - o que foi alterado;
    - arquivos principais;
    - testes executados;
    - riscos ou pendências;
    - migrações necessárias.

---

## 3. Stack oficial

### 3.1 Monorepo

Usar:

- Node.js LTS;
- TypeScript strict;
- pnpm workspaces;
- Turborepo;
- ESLint;
- Prettier;
- Husky;
- lint-staged;
- commitlint;
- Conventional Commits.

### 3.2 Frontend

Usar:

- Next.js com App Router;
- React;
- TypeScript;
- Tailwind CSS;
- shadcn/ui;
- Radix UI;
- React Hook Form;
- Zod;
- TanStack Query;
- Zustand somente para estado global de interface;
- next-intl para internacionalização;
- Lucide Icons;
- Recharts para dashboards;
- MapLibre ou Google Maps por adapter;
- Playwright para testes E2E;
- Vitest e Testing Library para testes unitários.

Regras:

- Server Components por padrão.
- Client Components somente quando houver interação, estado local ou API do navegador.
- Não buscar dados em `useEffect` quando Server Components ou TanStack Query forem adequados.
- Não duplicar estado remoto em Zustand.
- Não criar componentes gigantes.
- Não usar valores de cor arbitrários quando existir token de design.
- Não introduzir dependência sem justificar necessidade e custo.

### 3.3 Backend

Usar:

- NestJS;
- REST API versionada;
- OpenAPI/Swagger;
- class-validator ou Zod de forma consistente;
- Prisma ORM;
- MySQL;
- índices espaciais do MySQL para buscas geográficas;
- Redis;
- BullMQ para filas;
- WebSocket ou Server-Sent Events para eventos em tempo real;
- armazenamento S3 compatível;
- serviço de e-mail por adapter;
- serviço de pagamento por adapter;
- serviço de mapas/geocodificação por adapter.

### 3.4 Infraestrutura

Ambientes:

- local;
- test;
- staging;
- production.

Padrão inicial:

- Docker Compose para desenvolvimento;
- MySQL;
- Redis;
- MinIO;
- Mailpit;
- API;
- Web;
- Worker.

Produção:

- frontend em plataforma compatível com Next.js;
- API e worker em containers;
- MySQL gerenciado;
- Redis gerenciado;
- storage S3 compatível;
- CDN;
- observabilidade centralizada.

Não acoplar o domínio a um único provedor de nuvem.

---

## 4. Estrutura do repositório

```text
/
├── apps/
│   ├── web/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── components/
│   │   │   ├── features/
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   ├── providers/
│   │   │   ├── styles/
│   │   │   └── types/
│   │   └── tests/
│   ├── api/
│   │   ├── src/
│   │   │   ├── common/
│   │   │   ├── config/
│   │   │   ├── modules/
│   │   │   ├── infrastructure/
│   │   │   └── main.ts
│   │   └── test/
│   └── worker/
│       └── src/
├── packages/
│   ├── api-client/
│   ├── config/
│   ├── database/
│   ├── eslint-config/
│   ├── observability/
│   ├── types/
│   ├── ui/
│   └── validation/
├── docs/
│   ├── adr/
│   ├── api/
│   ├── architecture/
│   ├── database/
│   ├── product/
│   ├── security/
│   └── testing/
├── infra/
│   ├── docker/
│   └── scripts/
├── .opencode/
│   ├── agents/
│   ├── commands/
│   └── skills/
├── AGENTS.md
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

### 4.1 Organização frontend por feature

```text
features/
├── auth/
├── companies/
├── listings/
├── search/
├── proposals/
├── conversations/
├── logistics/
├── subscriptions/
├── notifications/
├── reviews/
└── admin/
```

Cada feature pode conter:

```text
feature-name/
├── api/
├── components/
├── hooks/
├── schemas/
├── types/
├── utils/
└── index.ts
```

### 4.2 Organização backend por módulo

```text
modules/listings/
├── application/
│   ├── commands/
│   ├── queries/
│   ├── dto/
│   └── services/
├── domain/
│   ├── entities/
│   ├── enums/
│   ├── events/
│   ├── repositories/
│   └── value-objects/
├── infrastructure/
│   ├── persistence/
│   ├── mappers/
│   └── integrations/
├── presentation/
│   ├── controllers/
│   └── presenters/
└── listings.module.ts
```

Evitar arquitetura cerimonial excessiva em módulos simples. Aplicar separação de camadas principalmente nos módulos de negócio críticos.

---

## 5. Agentes especializados

O agente principal atua como orquestrador. Ele deve delegar atividades específicas aos agentes abaixo quando disponíveis.

### 5.1 `product-architect`

Responsabilidades:

- transformar requisitos em fluxos funcionais;
- definir personas e jornadas;
- separar MVP, V1 e backlog;
- criar critérios de aceite;
- identificar regras de negócio;
- evitar escopo desnecessário.

Saída esperada:

- objetivo;
- usuários afetados;
- fluxo principal;
- exceções;
- critérios de aceite;
- entidades envolvidas;
- riscos;
- métricas.

### 5.2 `solution-architect`

Responsabilidades:

- definir arquitetura;
- analisar dependências;
- registrar decisões em ADR;
- avaliar escalabilidade;
- definir contratos entre módulos;
- impedir acoplamento desnecessário.

Nunca implementar diretamente antes de produzir a proposta técnica em tarefas arquiteturais.

### 5.3 `database-engineer`

Responsabilidades:

- modelagem MySQL;
- Prisma schema;
- migrações;
- índices;
- integridade referencial;
- índices espaciais;
- auditoria;
- performance de consultas;
- política de exclusão e retenção.

Regras:

- usar UUID;
- usar `datetime(3)` para timestamps;
- nomes de tabelas e colunas em `snake_case`;
- não usar `float` para dinheiro;
- dinheiro em `numeric(14,2)` ou minor units;
- quantidades em `numeric(16,3)`;
- nunca depender apenas de validação da aplicação;
- criar índices com base em consultas reais;
- migrações devem ser reversíveis quando possível;
- nunca editar migração já aplicada em produção.

### 5.4 `backend-engineer`

Responsabilidades:

- módulos NestJS;
- regras de negócio;
- REST API;
- autenticação;
- autorização;
- filas;
- integrações;
- testes unitários e de integração.

Regras:

- controller fino;
- regras em services/use cases;
- acesso ao banco por repository;
- DTO não é entidade;
- respostas não devem expor modelos Prisma diretamente;
- erros devem usar códigos de domínio;
- operações críticas devem ser idempotentes;
- transações em alterações multi-entidade;
- publicar eventos de domínio após confirmação da transação.

### 5.5 `frontend-engineer`

Responsabilidades:

- páginas Next.js;
- componentes;
- formulários;
- integração com API;
- responsividade;
- estados de interface;
- SEO;
- acessibilidade.

Regras:

- mobile-first;
- componentes reutilizáveis sem abstração prematura;
- formulários com validação compartilhada;
- imagens otimizadas;
- metadata por página;
- URLs legíveis;
- filtros refletidos na query string;
- paginação server-side;
- preservar filtros ao navegar entre resultados e detalhes.

### 5.6 `ui-ux-designer`

Responsabilidades:

- sistema visual;
- wireframes;
- hierarquia;
- fluxos;
- acessibilidade;
- responsividade;
- consistência.

Direção visual:

- aparência B2B confiável;
- moderna e limpa;
- uso moderado de verde, azul ou tons naturais;
- alto contraste;
- cartões com informações objetivas;
- interface densa o suficiente para operações empresariais;
- evitar aparência genérica de template;
- evitar excesso de gradientes;
- evitar animações decorativas que prejudiquem desempenho;
- não copiar concorrentes.

### 5.7 `security-engineer`

Responsabilidades:

- threat modeling;
- revisão de autenticação e autorização;
- LGPD;
- proteção contra abuso;
- segurança de uploads;
- logs;
- dependências;
- segredos;
- rate limiting.

Toda tarefa envolvendo conta, empresa, documento, pagamento, contato, mensagem ou administração exige revisão deste agente.

### 5.8 `qa-engineer`

Responsabilidades:

- estratégia de testes;
- cenários de borda;
- testes unitários;
- integração;
- E2E;
- regressão;
- acessibilidade;
- performance básica.

Não aceitar apenas testes de caminho feliz.

### 5.9 `devops-engineer`

Responsabilidades:

- Docker;
- CI/CD;
- ambientes;
- variáveis;
- observabilidade;
- backups;
- deployment;
- rollback;
- saúde dos serviços.

### 5.10 `code-reviewer`

Responsabilidades:

- revisar diff;
- detectar regressões;
- verificar arquitetura;
- verificar segurança;
- verificar testes;
- verificar complexidade;
- verificar acessibilidade;
- verificar documentação.

O revisor não deve alterar código durante a primeira revisão. Primeiro deve produzir achados classificados por severidade.

---

## 6. Fluxo obrigatório do orquestrador

Para cada feature relevante:

1. Ler `AGENTS.md`, documentação e código relacionado.
2. Solicitar análise do `product-architect`.
3. Solicitar desenho técnico do `solution-architect`.
4. Solicitar modelagem ao `database-engineer` quando houver persistência.
5. Solicitar threat model ao `security-engineer` quando houver dados sensíveis ou ações privilegiadas.
6. Implementar backend.
7. Implementar frontend.
8. Criar ou atualizar testes.
9. Executar revisão do `code-reviewer`.
10. Corrigir achados críticos e altos.
11. Executar validações finais.
12. Atualizar documentação.
13. Entregar resumo técnico.

Para correções pequenas, o fluxo pode ser reduzido, mas testes e revisão de impacto continuam obrigatórios.

---

## 7. Domínio do marketplace

### 7.1 Tipos principais de usuário

- visitante;
- usuário autenticado;
- membro de empresa;
- administrador de empresa;
- comprador;
- vendedor/gerador;
- transportador;
- operador/reciclador;
- moderador;
- administrador da plataforma;
- suporte;
- financeiro.

Um usuário pode participar de mais de uma empresa, com papéis diferentes.

### 7.2 Tipos de anúncio

- `BUY`: empresa deseja comprar um material;
- `SELL`: empresa deseja vender um material.

### 7.3 Ciclo do anúncio

```text
DRAFT
PENDING_REVIEW
PUBLISHED
PAUSED
NEGOTIATING
CLOSED
EXPIRED
REJECTED
ARCHIVED
```

Regras:

- somente anúncios publicados aparecem na busca pública;
- anúncios perigosos ou regulados exigem documentação e moderação adicional;
- alterações críticas em anúncio publicado podem retornar para revisão;
- anúncio encerrado não aceita novas propostas;
- exclusão deve ser lógica quando houver histórico comercial.

### 7.4 Ciclo da proposta

```text
PENDING
COUNTERED
ACCEPTED
REJECTED
CANCELLED
EXPIRED
```

Uma proposta aceita deve criar uma negociação ou pedido transacional.

### 7.5 Ciclo da negociação

```text
OPEN
AWAITING_DOCUMENTS
AWAITING_PAYMENT
AWAITING_PICKUP
IN_TRANSIT
DELIVERED
COMPLETED
DISPUTED
CANCELLED
```

O sistema deve manter histórico imutável das mudanças de estado.

---

## 8. Modelo de dados padrão

Banco oficial: MySQL 8.4.

### 8.1 Identidade e acesso

#### `users`

- `id uuid pk`
- `name varchar(150)`
- `email varchar(320) unique`
- `phone_e164 varchar(20) null`
- `password_hash text null`
- `email_verified_at datetime(3) null`
- `phone_verified_at datetime(3) null`
- `status user_status`
- `last_login_at datetime(3) null`
- `created_at datetime(3)`
- `updated_at datetime(3)`
- `deleted_at datetime(3) null`

#### `auth_accounts`

Para login social e provedores externos.

#### `sessions`

Armazenar sessões com hash do token, dispositivo, IP truncado ou protegido e expiração.

#### `roles`, `permissions`, `role_permissions`

RBAC da plataforma.

### 8.2 Empresas

#### `companies`

- `id`
- `legal_name`
- `trade_name`
- `tax_id_encrypted`
- `tax_id_hash unique`
- `company_type`
- `status`
- `verification_status`
- `description`
- `website_url`
- `logo_file_id`
- `rating_average`
- `rating_count`
- `created_at`
- `updated_at`
- `deleted_at`

Nunca armazenar CNPJ somente em texto aberto. Manter versão criptografada e hash normalizado para busca e unicidade.

#### `company_members`

- `company_id`
- `user_id`
- `role`
- `status`
- `invited_by`
- `joined_at`

Unique composto: `company_id + user_id`.

#### `company_addresses`

- endereço estruturado;
- latitude;
- longitude;
- latitude/longitude com índice espacial quando necessário;
- tipo do endereço;
- indicador principal.

#### `company_documents`

- tipo;
- número protegido;
- arquivo;
- validade;
- status de verificação;
- observação da moderação.

#### `company_verifications`

Histórico de verificações, não apenas estado atual.

### 8.3 Catálogo de resíduos

#### `waste_categories`

Estrutura hierárquica com `parent_id`.

Categorias iniciais:

- plástico;
- papel e papelão;
- metais;
- vidro;
- madeira;
- borracha;
- orgânicos;
- têxteis;
- eletroeletrônicos;
- construção e demolição;
- químicos;
- óleo usado;
- sucata geral;
- resíduos perigosos;
- outros.

#### `materials`

- categoria;
- nome;
- slug;
- descrição;
- código interno;
- unidade padrão;
- classe de risco;
- atributos técnicos;
- status.

#### `material_attributes`

Permite atributos configuráveis por categoria:

- cor;
- pureza;
- composição;
- granulometria;
- umidade;
- contaminação;
- estado físico;
- tipo de embalagem;
- certificação.

Usar estrutura relacional para atributos pesquisáveis. JSONB pode complementar, mas não substituir campos importantes para filtro.

### 8.4 Anúncios

#### `listings`

- `id`
- `company_id`
- `created_by_user_id`
- `type`
- `title`
- `slug`
- `description`
- `category_id`
- `material_id null`
- `quantity numeric(16,3)`
- `unit`
- `available_quantity numeric(16,3)`
- `price_type`
- `unit_price numeric(14,2) null`
- `currency char(3)`
- `frequency`
- `minimum_order_quantity`
- `condition`
- `packaging_type`
- `pickup_required`
- `delivery_available`
- `origin_address_id`
- `service_radius_km`
- `status`
- `published_at`
- `expires_at`
- `view_count`
- `favorite_count`
- `created_at`
- `updated_at`
- `deleted_at`

#### `listing_attributes`

Valores dos atributos técnicos do material.

#### `listing_media`

Fotos, laudos e documentos não sensíveis do anúncio.

#### `listing_status_history`

Auditoria de mudanças de status.

#### `listing_locations`

Usar quando um anúncio estiver disponível em múltiplas unidades.

### 8.5 Busca e relacionamento

#### `favorites`

Unique: `user_id + listing_id`.

#### `saved_searches`

- filtros em JSONB validado;
- frequência de alerta;
- último processamento;
- ativo/inativo.

#### `listing_views`

Dados agregáveis, com política de retenção e privacidade.

### 8.6 Negociação

#### `proposals`

- anúncio;
- empresa proponente;
- usuário responsável;
- quantidade;
- preço;
- moeda;
- prazo;
- logística;
- observações;
- status;
- validade.

#### `proposal_revisions`

Histórico imutável de contrapropostas.

#### `deals`

Representa a negociação aceita.

#### `deal_status_history`

Histórico imutável.

### 8.7 Mensagens

#### `conversations`

Relacionada a anúncio, proposta ou negociação.

#### `conversation_participants`

Participantes por usuário e empresa.

#### `messages`

- remetente;
- corpo;
- tipo;
- data;
- edição;
- remoção;
- status de leitura.

#### `message_attachments`

Uploads privados com autorização por participante.

Não permitir acesso ao arquivo somente por URL previsível.

### 8.8 Logística

#### `logistics_requests`

- origem;
- destino;
- material;
- peso/volume;
- janela de coleta;
- requisitos especiais;
- status.

#### `logistics_quotes`

Cotações de transportadores.

#### `shipments`

- transportador;
- motorista quando aplicável;
- veículo quando aplicável;
- rastreamento;
- comprovantes;
- status.

Não implementar rastreamento em tempo real no MVP sem necessidade comprovada.

### 8.9 Assinaturas e pagamentos

#### `plans`

- nome;
- preço;
- período;
- limites;
- recursos em JSONB validado;
- ativo.

#### `subscriptions`

- empresa;
- plano;
- provedor;
- id externo;
- status;
- ciclo;
- cancelamento.

#### `payment_transactions`

- valor;
- moeda;
- status;
- idempotency_key;
- referência externa;
- timestamps.

#### `contact_unlocks`

Quando o modelo comercial permitir desbloqueio de contato:

- empresa compradora;
- anúncio;
- cobrança;
- data;
- usuário;
- origem do direito: plano, crédito ou pagamento avulso.

Unique e idempotência obrigatórios.

### 8.10 Reputação e moderação

#### `reviews`

Somente após negociação elegível.

#### `reports`

Denúncias de anúncio, empresa, usuário ou mensagem.

#### `moderation_cases`

Fila de análise.

#### `moderation_actions`

Histórico imutável de ações administrativas.

### 8.11 Plataforma

#### `notifications`

- canal;
- tipo;
- payload validado;
- lida;
- enviada;
- falha.

#### `files`

Metadados de arquivos, hash, MIME detectado, tamanho, storage key e classificação de acesso.

#### `audit_logs`

- ator;
- empresa;
- ação;
- recurso;
- recurso_id;
- metadata redigida;
- timestamp;
- request_id.

Não registrar senhas, tokens, documentos completos, conteúdo sensível ou dados de pagamento.

#### `outbox_events`

Implementar transactional outbox para eventos que acionam filas, notificações ou integrações.

---

## 9. Índices essenciais

Criar, no mínimo:

- índice FULLTEXT de busca textual em anúncios;
- índice espacial na localização quando necessário;
- `listings(status, type, published_at desc)`;
- `listings(category_id, status)`;
- `listings(company_id, status)`;
- `proposals(listing_id, status)`;
- `proposals(proposer_company_id, status)`;
- `messages(conversation_id, created_at)`;
- `notifications(user_id, read_at, created_at desc)`;
- `audit_logs(resource_type, resource_id, created_at desc)`;
- índices parciais para registros ativos;
- índices para todas as foreign keys usadas em joins frequentes.

Toda adição de índice deve considerar custo de escrita e tamanho.

---

## 10. Busca

A primeira versão deve usar MySQL:

- full-text search;
- normalização de texto na aplicação;
- FULLTEXT search;
- índices espaciais do MySQL;
- ranking por relevância;
- filtros relacionais;
- paginação por cursor quando possível.

Filtros principais:

- compra ou venda;
- palavra-chave;
- categoria;
- material;
- cidade;
- estado;
- distância;
- quantidade;
- unidade;
- preço;
- frequência;
- disponibilidade;
- empresa verificada;
- entrega/coleta;
- data de publicação.

Migrar para OpenSearch/Meilisearch somente quando métricas demonstrarem necessidade.

A API de busca deve:

- validar filtros;
- limitar profundidade;
- limitar tamanho da página;
- usar ordenação determinística;
- impedir consultas arbitrárias;
- retornar facetas quando útil;
- manter filtros na URL do frontend.

---

## 11. API

Prefixo:

```text
/api/v1
```

Padrões:

- JSON;
- datas ISO 8601 em UTC;
- IDs UUID;
- paginação consistente;
- erros estruturados;
- `requestId` em todas as respostas de erro;
- OpenAPI atualizado;
- idempotency key em pagamentos e comandos críticos.

Formato de erro:

```json
{
  "error": {
    "code": "LISTING_NOT_FOUND",
    "message": "Anúncio não encontrado.",
    "details": [],
    "requestId": "uuid"
  }
}
```

Endpoints iniciais:

```text
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
POST   /auth/verify-email
POST   /auth/forgot-password
POST   /auth/reset-password

GET    /me
PATCH  /me

POST   /companies
GET    /companies/:id
PATCH  /companies/:id
POST   /companies/:id/members
GET    /companies/:id/members
POST   /companies/:id/documents

GET    /categories
GET    /materials

GET    /listings
POST   /listings
GET    /listings/:id
PATCH  /listings/:id
POST   /listings/:id/publish
POST   /listings/:id/pause
POST   /listings/:id/close
POST   /listings/:id/favorite
DELETE /listings/:id/favorite

POST   /listings/:id/proposals
GET    /proposals/:id
POST   /proposals/:id/counter
POST   /proposals/:id/accept
POST   /proposals/:id/reject
POST   /proposals/:id/cancel

GET    /conversations
GET    /conversations/:id/messages
POST   /conversations/:id/messages

GET    /notifications
POST   /notifications/:id/read

GET    /admin/moderation/cases
POST   /admin/moderation/cases/:id/approve
POST   /admin/moderation/cases/:id/reject
```

Não criar endpoint genérico que permita alteração arbitrária de status.

---

## 12. Autenticação e autorização

Padrão recomendado:

- sessão segura baseada em cookie HTTP-only para web;
- access token curto quando necessário;
- refresh token rotativo;
- revogação por sessão;
- MFA opcional e obrigatório para administradores;
- proteção CSRF quando aplicável;
- rate limiting;
- detecção de tentativas de login;
- bloqueio progressivo;
- e-mail verificado;
- auditoria de login.

Autorização:

1. autenticar usuário;
2. verificar estado do usuário;
3. verificar vínculo com empresa;
4. verificar papel;
5. verificar permissão;
6. verificar propriedade do recurso;
7. verificar estado do recurso.

Nunca confiar em `companyId`, `role`, preço ou status enviados pelo frontend sem validação no servidor.

---

## 13. Segurança e LGPD

### 13.1 Regras obrigatórias

- aplicar princípio do menor privilégio;
- criptografar dados sensíveis;
- TLS em produção;
- cookies `Secure`, `HttpOnly` e `SameSite`;
- CSP;
- HSTS;
- proteção contra XSS, CSRF, SSRF e SQL injection;
- sanitização de conteúdo rico;
- rate limiting por IP, usuário e empresa;
- bloqueio de enumeração de contas;
- validação de MIME por conteúdo;
- limite de tamanho de upload;
- nomes aleatórios no storage;
- antivirus ou scanner assíncrono para documentos;
- URLs assinadas e curtas para arquivos privados;
- backups criptografados;
- rotação de segredos;
- logs redigidos;
- Sentry ou equivalente sem PII desnecessária.

### 13.2 LGPD

O sistema deve suportar:

- consentimentos quando necessários;
- base legal registrada;
- exportação de dados;
- correção;
- anonimização;
- exclusão quando legalmente permitida;
- retenção configurável;
- registro de acesso administrativo;
- política de privacidade versionada;
- termos de uso versionados;
- aceite com data e versão.

Dados ligados a transações, fraude, auditoria ou obrigação legal podem exigir retenção. Não apagar de forma indiscriminada.

---

## 14. Uploads

Tipos aceitos devem ser allowlist.

Imagens:

- JPEG;
- PNG;
- WebP.

Documentos:

- PDF, somente quando necessário.

Fluxo:

1. cliente solicita upload;
2. servidor valida intenção e permissão;
3. servidor gera URL assinada;
4. cliente envia;
5. worker valida tamanho, MIME, hash e segurança;
6. arquivo recebe status `READY` ou `REJECTED`;
7. somente arquivos `READY` podem ser exibidos.

Não processar arquivos pesados no request principal.

---

## 15. Design system

Criar tokens semânticos:

```text
background
foreground
surface
surface-muted
primary
primary-foreground
secondary
accent
success
warning
danger
border
ring
```

Requisitos:

- modo claro obrigatório;
- modo escuro opcional;
- contraste WCAG AA;
- foco visível;
- navegação por teclado;
- labels reais;
- feedback de erro associado ao campo;
- áreas clicáveis adequadas;
- tabelas responsivas;
- skeletons sem layout shift;
- `prefers-reduced-motion`;
- componentes compatíveis com leitor de tela.

Componentes principais:

- header público;
- header autenticado;
- sidebar do dashboard;
- campo de busca;
- filtros;
- card de anúncio;
- tabela de anúncios;
- badge de status;
- seletor de localização;
- uploader;
- chat;
- timeline;
- modal de confirmação;
- empty state;
- pricing card;
- KPI card;
- data table;
- pagination;
- toast;
- command menu.

---

## 16. Páginas mínimas

### Públicas

```text
/
 /como-funciona
 /anuncios
 /anuncios/[slug]
 /categorias/[slug]
 /empresas/[slug]
 /planos
 /entrar
 /cadastro
 /recuperar-senha
 /termos
 /privacidade
```

### Área autenticada

```text
/dashboard
/dashboard/anuncios
/dashboard/anuncios/novo
/dashboard/anuncios/[id]/editar
/dashboard/propostas
/dashboard/negociacoes
/dashboard/mensagens
/dashboard/favoritos
/dashboard/buscas-salvas
/dashboard/empresa
/dashboard/empresa/membros
/dashboard/empresa/documentos
/dashboard/assinatura
/dashboard/configuracoes
```

### Administração

```text
/admin
/admin/usuarios
/admin/empresas
/admin/anuncios
/admin/moderacao
/admin/denuncias
/admin/assinaturas
/admin/pagamentos
/admin/auditoria
/admin/configuracoes
```

---

## 17. MVP recomendado

### Fase 1

- landing page;
- cadastro e login;
- criação de empresa;
- perfil básico da empresa;
- categorias e materiais;
- anúncio de compra e venda;
- listagem e busca;
- página do anúncio;
- favoritos;
- propostas;
- mensagens;
- notificações;
- moderação básica;
- painel administrativo;
- auditoria;
- e-mails transacionais.

### Fase 2

- verificação documental;
- planos;
- pagamento;
- desbloqueio de contato;
- busca salva;
- alertas;
- avaliações;
- relatórios;
- geolocalização avançada.

### Fase 3

- logística;
- integrações ERP;
- relatórios ambientais;
- recomendação de ofertas;
- API pública;
- aplicativo móvel, somente se houver demanda.

Não começar por microserviços, IA generativa, blockchain ou aplicativo móvel.

---

## 18. Convenções TypeScript

- `strict: true`;
- evitar `any`;
- usar `unknown` em entradas não confiáveis;
- usar tipos discriminados para estados;
- não usar enum numérico;
- funções pequenas;
- nomes explícitos;
- não usar abreviações obscuras;
- não usar non-null assertion sem justificativa;
- validar dados em boundaries;
- tipos compartilhados devem vir de contratos, não de modelos do banco.

Exemplo:

```ts
type ListingType = 'BUY' | 'SELL'

type ListingStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'PUBLISHED'
  | 'PAUSED'
  | 'NEGOTIATING'
  | 'CLOSED'
  | 'EXPIRED'
  | 'REJECTED'
  | 'ARCHIVED'
```

---

## 19. Convenções de banco e Prisma

- modelos Prisma em PascalCase;
- mapeamento para banco em snake_case;
- usar `@map` e `@@map`;
- relações explícitas;
- `onDelete` definido conscientemente;
- evitar cascade em dados de auditoria e negociação;
- usar soft delete somente onde necessário;
- consultas devem filtrar soft deleted por padrão;
- seeds determinísticos;
- factories para testes;
- migração acompanhada de descrição.

Toda alteração de schema deve incluir:

1. mudança no Prisma;
2. migração;
3. atualização de seed/factory;
4. atualização de testes;
5. análise de índice;
6. análise de dados existentes;
7. plano de rollback ou mitigação.

---

## 20. Testes

Pirâmide:

- muitos testes unitários;
- testes de integração dos módulos;
- poucos E2E críticos;
- testes de contrato da API;
- testes de autorização.

Cobertura obrigatória de fluxos críticos:

- cadastro;
- login;
- recuperação de senha;
- criação de empresa;
- convite de membro;
- criação e publicação de anúncio;
- busca;
- proposta;
- contraproposta;
- aceite;
- mensagens;
- moderação;
- assinatura;
- pagamento idempotente;
- autorização multiempresa;
- acesso a arquivo privado.

Comandos esperados:

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm db:migrate
pnpm db:studio
```

Antes de considerar tarefa concluída:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Para alterações críticas, executar integração e E2E relevantes.

Nunca afirmar que um teste passou sem executá-lo.

---

## 21. Performance

Metas iniciais:

- evitar N+1;
- paginação obrigatória;
- não retornar payloads desnecessários;
- cache somente com política clara de invalidação;
- imagens responsivas;
- lazy loading;
- bundle controlado;
- consultas observáveis;
- filas para tarefas lentas;
- timeouts em integrações;
- retries com backoff;
- circuit breaker quando necessário.

Web Vitals devem ser monitorados.

Não otimizar prematuramente sem métricas.

---

## 22. Observabilidade

Cada request deve ter `requestId`.

Implementar:

- logs estruturados;
- métricas;
- traces;
- health checks;
- readiness;
- liveness;
- alertas;
- rastreamento de jobs;
- painel de erros;
- auditoria.

Campos úteis de log:

- timestamp;
- level;
- service;
- environment;
- requestId;
- userId quando permitido;
- companyId quando permitido;
- action;
- duration;
- statusCode;
- errorCode.

Nunca logar:

- senha;
- token;
- cookie;
- documento completo;
- dados bancários;
- conteúdo privado de mensagem;
- URL assinada completa.

---

## 23. Filas e eventos

Filas iniciais:

- `email`;
- `notifications`;
- `file-scan`;
- `search-index`;
- `listing-expiration`;
- `saved-search-alerts`;
- `webhooks`;
- `reports`.

Regras:

- jobs idempotentes;
- retries limitados;
- backoff exponencial;
- dead-letter queue;
- correlation ID;
- payload versionado;
- monitoramento;
- nenhuma regra de negócio crítica apenas no worker sem persistência do estado.

Eventos de domínio iniciais:

```text
user.registered
company.created
company.verification.requested
company.verified
listing.created
listing.submitted
listing.published
listing.rejected
proposal.created
proposal.countered
proposal.accepted
deal.created
message.sent
subscription.activated
payment.confirmed
report.created
```

---

## 24. Integrações

Toda integração externa deve usar interface/adapter.

Exemplos:

```text
PaymentProvider
EmailProvider
StorageProvider
GeocodingProvider
MapsProvider
AntivirusProvider
CompanyRegistryProvider
NotificationProvider
```

Regras:

- timeout;
- retry consciente;
- idempotência;
- logs sem segredos;
- mock para testes;
- sandbox;
- webhook assinado;
- validação do evento;
- persistência de eventos recebidos;
- processamento assíncrono quando possível.

---

## 25. Git e revisão

Branches:

```text
feat/descricao-curta
fix/descricao-curta
refactor/descricao-curta
chore/descricao-curta
```

Commits:

```text
feat(listings): add listing publication flow
fix(auth): prevent refresh token reuse
refactor(search): extract filter parser
test(proposals): cover counteroffer permissions
docs(architecture): record storage decision
```

Pull requests devem conter:

- contexto;
- solução;
- screenshots quando houver UI;
- mudanças no banco;
- testes;
- riscos;
- rollback;
- checklist.

Não misturar refatoração ampla com feature sem necessidade.

---

## 26. Definition of Done

Uma tarefa somente está concluída quando:

- critérios de aceite atendidos;
- código segue arquitetura;
- validação de entrada implementada;
- autorização revisada;
- estados de erro tratados;
- testes criados ou atualizados;
- lint aprovado;
- typecheck aprovado;
- build aprovado;
- migração testada quando aplicável;
- documentação atualizada;
- logs e métricas avaliados;
- acessibilidade avaliada;
- segurança avaliada;
- nenhum segredo exposto;
- reviewer sem achados críticos ou altos.

---

## 27. Proibições

Os agentes não devem:

- copiar concorrentes;
- expor dados de contato sem regra comercial e autorização;
- permitir upload público irrestrito;
- confiar em autorização apenas no frontend;
- usar senha sem hash forte;
- armazenar tokens em localStorage quando cookie seguro for aplicável;
- usar `any` para evitar modelagem;
- criar tabelas sem timestamps;
- usar exclusão física em histórico comercial sem análise;
- adicionar microserviços sem necessidade;
- adicionar dependências duplicadas;
- criar abstrações sem uso real;
- ignorar erros de TypeScript;
- desativar lint ou testes para fazer build passar;
- criar endpoint administrativo sem auditoria;
- processar pagamento sem idempotência;
- editar migração já aplicada;
- executar comando destrutivo de banco sem autorização explícita;
- usar dados reais de clientes em desenvolvimento ou testes;
- publicar credenciais;
- deixar TODO crítico sem registrar pendência.

---

## 28. Formato de entrega dos agentes

Ao finalizar uma tarefa, responder com:

```text
Resumo
- ...

Arquivos alterados
- ...

Banco de dados
- Migração: sim/não
- Impacto: ...

Validação
- lint: executado/não executado
- typecheck: executado/não executado
- testes: ...
- build: executado/não executado

Segurança
- ...

Pendências
- ...
```

---

## 29. Prioridades do projeto

Em caso de conflito, seguir esta ordem:

1. segurança e privacidade;
2. integridade dos dados;
3. regras de negócio;
4. confiabilidade;
5. acessibilidade;
6. experiência do usuário;
7. manutenção;
8. performance comprovada;
9. velocidade de implementação;
10. preferências estéticas.

---

## 30. Primeira sequência de implementação

Quando o repositório estiver vazio, executar nesta ordem:

1. criar monorepo pnpm + Turborepo;
2. configurar TypeScript, lint, format e commits;
3. criar `apps/web`, `apps/api` e `apps/worker`;
4. criar Docker Compose;
5. configurar MySQL, Redis, MinIO e Mailpit;
6. configurar Prisma;
7. criar módulo de configuração;
8. criar health checks;
9. criar autenticação;
10. criar usuários e sessões;
11. criar empresas e membros;
12. criar catálogo de categorias e materiais;
13. criar anúncios;
14. criar busca;
15. criar propostas;
16. criar mensagens;
17. criar notificações;
18. criar moderação;
19. criar painel administrativo;
20. configurar CI;
21. configurar observabilidade;
22. fazer revisão de segurança;
23. preparar staging.

Não avançar para pagamentos ou logística antes dos fluxos principais estarem estáveis.

---

## 31. Critério para decisões não especificadas

Quando uma decisão não estiver definida:

1. verificar código e documentação;
2. seguir o padrão já existente;
3. escolher a solução mais simples que preserve evolução;
4. registrar decisão relevante em ADR;
5. não bloquear uma tarefa por preferência estética;
6. perguntar apenas quando a decisão alterar produto, custo, segurança ou compatibilidade de forma relevante.

Este arquivo é a fonte principal de orientação para agentes no repositório. Regras específicas podem existir em arquivos `AGENTS.md` dentro de subdiretórios, desde que não contradigam estas regras globais.
