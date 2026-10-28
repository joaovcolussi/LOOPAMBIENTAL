# LOOP AMBIENTAL

Marketplace B2B para compra, venda e negociação de resíduos, recicláveis,
sucatas e materiais reaproveitáveis.

Funciona em **Windows**, **Linux** e **macOS**. Todos os comandos deste guia
usam `corepack pnpm` e scripts Node.js, então são os mesmos no PowerShell, no
Prompt de Comando e no Bash. Quando um passo muda entre sistemas, as duas
versões aparecem lado a lado.

## Sumário

- [Início rápido](#início-rápido)
- [O que está implementado](#o-que-está-implementado)
- [Laudos nos anúncios](#laudos-nos-anúncios)
- [Requisitos](#requisitos)
- [Instalação](#instalação)
- [Desenvolvimento com hot reload](#desenvolvimento-com-hot-reload)
- [Executar tudo em containers](#executar-tudo-em-containers)
- [Banco de dados e migrações](#banco-de-dados-e-migrações)
- [Primeira conta e administração](#primeira-conta-e-administração)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Testes e validação](#testes-e-validação)
- [Diagnóstico](#diagnóstico)
- [Estrutura](#estrutura)
- [Pendências antes de produção](#pendências-antes-de-produção)

## Início rápido

```bash
git clone https://github.com/joaovcolussi/LOOPAMBIENTAL.git
cd LOOPAMBIENTAL
corepack enable
corepack pnpm install
corepack pnpm start
```

`corepack pnpm start`:

1. cria `.env` e `apps/web/.env.local` se ainda não existirem, gerando uma
   chave `FIELD_ENCRYPTION_KEY` aleatória;
2. detecta Docker Compose ou Podman Compose (inicia a máquina Podman no
   Windows/macOS quando necessário);
3. sobe MySQL, Redis, MinIO e Mailpit e espera o MySQL ficar saudável;
4. gera o client do Prisma e aplica as migrações;
5. inicia API, Web e Worker com hot reload.

Abra `http://localhost:3000`. Pressione `Ctrl+C` para encerrar; os containers
de infraestrutura continuam rodando até você executar `corepack pnpm stop`.

| Comando                     | O que faz                                      |
| --------------------------- | ---------------------------------------------- |
| `corepack pnpm start`       | Infraestrutura + migrações + API, Web e Worker |
| `corepack pnpm start:infra` | Sobe apenas MySQL, Redis, MinIO e Mailpit      |
| `corepack pnpm start:db`    | Aplica as migrações no banco em execução       |
| `corepack pnpm stop`        | Para os containers (mantém os dados)           |
| `corepack pnpm start down`  | Remove os containers (mantém os volumes)       |
| `corepack pnpm dev`         | Só inicia API, Web e Worker (infra já rodando) |
| `corepack pnpm db:migrate`  | Aplica migrações (`prisma migrate deploy`)     |
| `corepack pnpm db:generate` | Regenera o client do Prisma                    |

Para forçar um provedor de containers, defina `COMPOSE` antes do comando:

```powershell
# Windows PowerShell
$env:COMPOSE = "podman compose"; corepack pnpm start
```

```bash
# Linux/macOS
COMPOSE="podman compose" corepack pnpm start
```

## O que está implementado

- Cadastro, login, recuperação de senha e verificação de e-mail.
- Empresas, membros, convites e contatos com controle de visibilidade.
- Verificação documental de empresas (cartão CNPJ, contrato social, licenças).
- Categorias, materiais e anúncios de compra (`BUY`) ou venda (`SELL`).
- **Laudos e documentos técnicos nos anúncios** de compra e venda (veja abaixo).
- Busca com índice `FULLTEXT`, ranking por relevância, facetas, filtros por
  raio/distância, favoritos, buscas salvas e paginação por cursor.
- Propostas, contrapropostas, negociações e mensagens.
- Notificações, moderação, denúncias, pagamentos e solicitações logísticas.
- Planos e assinaturas (`/dashboard/assinatura`) com desbloqueio de contato.
- Avaliações e reputação após negociação concluída.
- Painel administrativo com indicadores, moderação, carrossel, usuários,
  empresas, anúncios, assinaturas, pagamentos, auditoria e configurações.
- Arquivos privados (fotos, laudos, documentos) no MinIO/S3.
- Worker com BullMQ + Redis e transactional outbox.
- CI com lint, typecheck, testes unitários, build e E2E (Playwright).

Pagamentos Mercado Pago e e-mail real dependem de credenciais externas. Em
desenvolvimento, os e-mails ficam no Mailpit (`http://localhost:8025`).

## Laudos nos anúncios

Anúncios de **venda** e de **compra** aceitam laudos e documentos técnicos:

| Tipo                          | Uso típico                                 |
| ----------------------------- | ------------------------------------------ |
| Laudo técnico                 | Caracterização do resíduo (ex.: NBR 10004) |
| Laudo de análise laboratorial | Composição, umidade, contaminantes         |
| FDS / FISPQ                   | Ficha de dados de segurança do material    |
| Outro documento técnico       | Especificação de compra, certificados      |

Como usar:

- **Novo anúncio** (`/dashboard/anuncios/novo`): na seção "Laudos e documentos
  técnicos", escolha o tipo, a validade (opcional) e o arquivo, clique em
  "Adicionar laudo" e envie o anúncio. Os laudos sobem junto com as fotos.
- **Anúncio existente** (`/dashboard/anuncios/[id]`): anexe ou remova laudos.
  Anexar um laudo em anúncio publicado o devolve para a moderação.
- **Página pública** (`/anuncios/[slug]`): lista os laudos com tipo, tamanho e
  validade (vencidos ficam destacados). O download exige login.
- **Moderação** (`/admin/moderacao`): moderadores baixam os laudos dos anúncios
  em análise.

Regras: até 5 laudos por anúncio, PDF, JPEG, PNG ou WebP com até 10 MB cada. O
tipo é detectado pelo conteúdo (não pela extensão); imagens são decodificadas e
convertidas para WebP. Os arquivos ficam em bucket privado, são servidos como
download (`Content-Disposition: attachment`, `nosniff`, CSP `sandbox`) e a
remoção é lógica (`deleted_at`) para preservar o histórico da negociação.

API:

```text
POST   /api/v1/listings/:id/documents              multipart: document, type, validUntil (AAAA-MM-DD)
DELETE /api/v1/listings/:id/documents/:documentId
GET    /api/v1/listings/documents/:id              usuário autenticado, anúncio publicado
GET    /api/v1/listings/documents/:id/owner        membros da empresa anunciante
GET    /api/v1/admin/moderation/cases/documents/:id moderadores
```

## Requisitos

| Sistema | Containers                         | Terminal          |
| ------- | ---------------------------------- | ----------------- |
| Windows | Docker Desktop ou Podman Desktop   | PowerShell ou CMD |
| Linux   | Docker Engine ou Podman (rootless) | Bash, Zsh etc.    |
| macOS   | Docker Desktop ou Podman Desktop   | Terminal          |

Também é necessário:

- Node.js 22 ou 24 LTS (inclui o Corepack);
- pnpm `9.15.5` (instalado automaticamente pelo Corepack);
- Git;
- cerca de 8 GB de RAM livres.

Confira as ferramentas:

```bash
node --version
corepack pnpm --version
docker compose version
```

Com Podman, use `podman compose version`. As portas `3000`, `3001`, `3306`,
`6379`, `9000`, `9001`, `1025` e `8025` precisam estar livres.

> **Windows:** o repositório tem `.gitattributes` que força finais de linha LF,
> então não é preciso mudar o `core.autocrlf`. Se você clonou antes dessa
> mudança e o `lint` acusa todos os arquivos, rode
> `git rm --cached -r . ; git reset --hard` (descarta alterações locais não
> commitadas) para renormalizar.

## Instalação

```bash
git clone https://github.com/joaovcolussi/LOOPAMBIENTAL.git
cd LOOPAMBIENTAL
corepack enable
corepack pnpm install
```

O `install` também gera o client do Prisma automaticamente. No Windows, se
`corepack enable` pedir permissão de administrador, abra o terminal como
administrador uma vez ou use sempre o prefixo `corepack pnpm`.

Os arquivos de ambiente são criados pelo `corepack pnpm start`. Para criá-los
manualmente:

```powershell
# Windows PowerShell
Copy-Item .env.example .env
Copy-Item apps/web/.env.example apps/web/.env.local
```

```bash
# Linux/macOS
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
```

Ao copiar manualmente, troque `FIELD_ENCRYPTION_KEY` por uma chave própria:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Nunca publique `.env`, `.env.local`, tokens ou senhas reais.

## Desenvolvimento com hot reload

`corepack pnpm start` faz tudo. Para controlar cada etapa:

```bash
corepack pnpm start:infra
corepack pnpm start:db
corepack pnpm dev
```

Ou, em três terminais separados na raiz:

```bash
corepack pnpm --filter @loopambiental/api dev
```

```bash
corepack pnpm --filter @loopambiental/web dev
```

```bash
corepack pnpm --filter @loopambiental/worker dev
```

Não use o modo containerizado e o modo hot reload ao mesmo tempo: ambos usam as
portas `3000` e `3001`.

## Executar tudo em containers

O `docker-compose.yml` também empacota API, Web e Worker (imagens de produção):

```bash
docker compose build
docker compose up -d
corepack pnpm db:migrate
docker compose ps
```

Com Podman, troque `docker compose` por `podman compose`. No Windows e no macOS
inicialize a máquina Podman uma vez com `podman machine init` e depois
`podman machine start`.

As migrações rodam a partir do host (`localhost:3306`); dentro dos containers a
API usa o hostname `mysql`. Defina `FIELD_ENCRYPTION_KEY` no `.env` antes do
primeiro `up`: o Compose lê esse arquivo.

Parar e limpar:

```bash
docker compose stop
docker compose down
```

Não use `down -v` sem ter certeza: ele apaga os volumes do MySQL e do MinIO.

### Endereços

| Serviço       | Endereço                              |
| ------------- | ------------------------------------- |
| Frontend      | `http://localhost:3000`               |
| API           | `http://localhost:3001/api/v1`        |
| Healthcheck   | `http://localhost:3001/api/v1/health` |
| Mailpit       | `http://localhost:8025`               |
| MinIO Console | `http://localhost:9001`               |

## Banco de dados e migrações

- MySQL 8.4 com Prisma; o schema fica em `packages/database/prisma/schema.prisma`.
- `corepack pnpm db:migrate` aplica todas as migrações (`prisma migrate deploy`),
  incluindo o catálogo de referência de categorias e materiais.
- Para criar uma migração nova em desenvolvimento:
  `corepack pnpm --filter @loopambiental/database db:migrate`.
- Nunca edite uma migração já aplicada.
- `schema.sql` na raiz é gerado a partir do schema Prisma e serve só como
  referência; não o aplique manualmente.

Um banco antigo criado com `db:push` deve registrar a linha de base antes de
receber as migrações incrementais:

```bash
corepack pnpm --filter @loopambiental/database exec tsx --env-file=../../.env node_modules/prisma/build/index.js migrate resolve --applied 20260902000000_baseline
corepack pnpm db:migrate
```

## Primeira conta e administração

Não há dados de demonstração. Cadastre-se em `/cadastro` e crie sua empresa.
Para acesso administrativo, inclua seu e-mail em `ADMIN_EMAILS` no `.env` (ou
altere `users.platform_role`).

O painel fica em `/admin`: indicadores, moderação (`/admin/moderacao`),
carrossel (`/admin/carrossel`), usuários, empresas, anúncios, assinaturas,
pagamentos, auditoria e configurações. Somente administradores alteram papéis,
status, configurações e carrossel; administradores e moderadores decidem casos
de moderação. Toda mutação administrativa exige sessão e origem válida e é
registrada em `audit_logs`.

## Variáveis de ambiente

`.env.example` lista todas as variáveis. As principais:

| Variável               | Uso                                                     |
| ---------------------- | ------------------------------------------------------- |
| `DATABASE_URL`         | Conexão MySQL                                           |
| `REDIS_URL`            | Filas BullMQ (sem ela o worker faz polling do outbox)   |
| `WEB_ORIGIN`           | Origem aceita pelo CORS/CSRF da API                     |
| `WEB_PUBLIC_URL`       | URL pública do frontend (links de e-mail e retorno)     |
| `API_PUBLIC_URL`       | URL pública da API (webhook do Mercado Pago)            |
| `FIELD_ENCRYPTION_KEY` | Chave de criptografia do CNPJ — única por ambiente      |
| `ADMIN_EMAILS`         | E-mails promovidos a administrador                      |
| `SMTP_*`               | Envio de e-mail (Mailpit em desenvolvimento)            |
| `STORAGE_*`            | Bucket S3/MinIO privado para fotos, laudos e documentos |
| `MP_*`                 | Credenciais do Mercado Pago                             |
| `NEXT_PUBLIC_API_URL`  | URL da API usada pelo frontend (`apps/web/.env.local`)  |

Não troque `FIELD_ENCRYPTION_KEY` de um banco que já tem empresas cadastradas:
os CNPJs criptografados com a chave antiga deixam de ser legíveis.

## Testes e validação

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

A API usa Jest e o frontend usa Vitest. Os testes E2E (Playwright) exigem a
stack rodando:

```bash
corepack pnpm exec playwright install chromium
corepack pnpm test:e2e
```

Se o `typecheck` ou os testes da API reclamarem de tipos do Prisma
(`PrismaClientKnownRequestError`, `InputJsonValue`), rode
`corepack pnpm db:generate`.

## Diagnóstico

```bash
docker compose ps
docker compose logs api
docker compose logs mysql
```

Se a API não iniciar:

1. confirme que o MySQL está `healthy`;
2. confira se `DATABASE_URL` existe no `.env`;
3. rode `corepack pnpm db:migrate`;
4. acesse `http://localhost:3001/api/v1/health`.

Portas ocupadas:

```powershell
# Windows PowerShell
Get-NetTCPConnection -LocalPort 3000,3001,3306,6379,9000,9001,1025,8025 -ErrorAction SilentlyContinue
```

```bash
# Linux/macOS
ss -ltnp | grep -E ':3000|:3001|:3306|:6379|:9000|:9001|:1025|:8025'
```

No Linux com SELinux, prefira os volumes nomeados do Compose. Para bind mounts,
use `:Z` (exclusivo do container) ou `:z` (compartilhado).

## Estrutura

```text
apps/api            API NestJS (REST /api/v1)
apps/web            Frontend Next.js (App Router)
apps/worker         Worker de jobs (outbox + BullMQ)
packages/database   Prisma schema, migrações e client
infra/docker        Containerfiles OCI
infra/scripts       start.mjs (inicialização multiplataforma)
e2e                 Testes Playwright
docs                ADRs e auditorias
docker-compose.yml  Stack local Docker/Podman
schema.sql          DDL de referência gerado do schema Prisma
```

## Pendências antes de produção

- MFA para administradores e observabilidade completa.
- Scanner antivírus assíncrono para fotos, laudos e documentos.
- Cobrança real das assinaturas e dos desbloqueios avulsos de contato.
- Validação de pagamentos em sandbox.
- Transição de negociação para `COMPLETED` (pré-requisito das avaliações).
- Backups, retenção e plano de rollback.
- Revisão jurídica e LGPD.
