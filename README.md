# LOOP AMBIENTAL

Marketplace B2B para compra, venda e negociação de resíduos, recicláveis,
sucatas, subprodutos e materiais reaproveitáveis.

A plataforma conecta empresas geradoras, compradoras, recicladoras e operadores.
O fluxo atual permite cadastrar empresas, publicar oportunidades, pesquisar
materiais, visualizar detalhes comerciais, enviar propostas, trocar mensagens,
usar favoritos, moderar anúncios, criar checkouts de pagamento e solicitar
cotações logísticas manuais.

## Status do Projeto

Este repositório está preparado para desenvolvimento local e demonstração do
MVP. Pagamentos reais dependem das credenciais do Mercado Pago. A logística
possui fluxo manual de solicitação e cotação. O worker está estruturado, mas
ainda não processa jobs BullMQ reais.

## Requisitos

- Node.js LTS, recomendado Node 22 ou 24.
- Corepack habilitado.
- Docker Compose ou Podman com `podman compose`.
- Git, caso o projeto seja obtido por repositório.
- Aproximadamente 8 GB de RAM para todos os serviços.

### Matriz de ambientes

| Ambiente | Runtime de containers | Terminal | Observação |
| -------- | ---------------------- | -------- | ---------- |
| Windows 10/11 | Docker Desktop com engine Linux | PowerShell | Ative WSL2 no Docker Desktop |
| Windows 10/11 | Podman Machine | PowerShell | A máquina virtual do Podman é obrigatória |
| Linux | Podman rootless ou Docker Engine | Bash | Podman Machine não é necessária |
| macOS | Docker Desktop ou Podman Machine | Terminal | O fluxo é equivalente ao Windows |

Para o modo containerizado, Node.js só é necessário no host para executar os
comandos Prisma de criação do schema e dos dados demo. Para desenvolvimento com
hot reload, Node.js e pnpm são obrigatórios.

Antes de iniciar, confirme que as portas `3000`, `3001`, `3306`, `6379`,
`9000`, `9001`, `1025` e `8025` estão livres. Não instale dependências usando
mistura de `npm`, `yarn` e `pnpm`: o projeto usa exclusivamente pnpm `9.15.5`.

Verifique as instalações:

```bash
node --version
corepack --version
docker --version
docker compose version
```

No Windows, execute os comandos no PowerShell. Linux e macOS usam os mesmos
comandos `pnpm`, `docker` e `cp`. Em Linux com Podman, use `podman --version` e
`podman compose version`.

### Podman no Linux

O fluxo suportado usa containers rootless e não exige Docker Desktop. Instale o
Podman e um provedor Compose compatível (`podman compose` ou `podman-compose`),
depois execute na raiz do projeto:

```bash
podman machine init 2>/dev/null || true
podman machine start 2>/dev/null || true
podman compose build
podman compose up -d
podman compose ps
```

No Linux nativo, os comandos `podman machine` podem ser omitidos. A stack inclui
API, frontend, worker, MySQL, Redis, MinIO e Mailpit. Os serviços ficam
acessíveis somente em `127.0.0.1` por padrão. Os dados persistem nos volumes
nomeados `mysql-data` e `minio-data`.

### Podman no Windows

No Windows, o Podman executa os containers dentro de uma máquina virtual. Abra
PowerShell ou Windows Terminal e execute:

```powershell
podman machine init
podman machine start
podman compose build
podman compose up -d
podman compose ps
```

Se a máquina já existir, `podman machine init` pode informar que ela já está
criada; nesse caso, execute apenas `podman machine start`. Para acessar a
aplicação, use `http://localhost:3000`. Se uma porta estiver ocupada, pare o
processo correspondente ou altere o mapeamento no `docker-compose.yml`.

### Docker Desktop no Windows ou Linux

Docker Desktop no Windows e Docker Engine no Linux usam o mesmo Compose:

```bash
docker compose build
docker compose up -d
docker compose ps
```

No PowerShell, os mesmos comandos funcionam com `docker compose`. Não execute
`docker-compose` antigo se o comando moderno `docker compose` estiver disponível.

Para acompanhar ou parar a stack:

```bash
podman compose logs -f api
podman compose stop
podman compose down
```

Não use `podman compose down -v` sem confirmar: isso remove o banco local e os
arquivos do MinIO. Em hosts Linux com SELinux, prefira os volumes nomeados já
configurados; ao adicionar bind mounts, avalie os rótulos `:Z` ou `:z`.

## Instalação em Outro Computador

### 1. Obter o projeto

Com Git:

```bash
git clone https://github.com/joaovcolussi/LOOPAMBIENTAL
cd loopambiental
```

Se o projeto for recebido como arquivo compactado, extraia-o e abra um terminal
na pasta que contém `package.json`.

### 2. Habilitar Corepack e instalar dependências

```bash
corepack enable
corepack pnpm install
```

O projeto usa pnpm `9.15.5` definido no `package.json`. Não é necessário instalar
pnpm globalmente.

### 3. Criar os arquivos de ambiente

PowerShell:

```powershell
Copy-Item .env.example .env
Copy-Item apps/web/.env.example apps/web/.env.local
```

Linux/macOS:

```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
```

Abra o `.env` e configure pelo menos:

```env
DATABASE_URL="mysql://loopambiental:loopambiental_local@localhost:3306/loopambiental"
PORT=3001
WEB_ORIGIN="http://localhost:3000"
ADMIN_EMAILS="admin@loopambiental.com"
DEMO_ADMIN_EMAIL="admin@loopambiental.com"
DEMO_ADMIN_PASSWORD="loopambiental"
SMTP_HOST="localhost"
SMTP_PORT=1025
SMTP_FROM="LOOP AMBIENTAL <no-reply@loopambiental.com>"
WEB_PUBLIC_URL="http://localhost:3000"
FIELD_ENCRYPTION_KEY="configure-a-strong-secret-in-production"
MP_ACCESS_TOKEN="configure-mercado-pago-access-token"
MP_WEBHOOK_SECRET="configure-mercado-pago-webhook-secret"
MP_API_URL="https://api.mercadopago.com"
```

O arquivo `apps/web/.env.local` deve conter:

```env
NEXT_PUBLIC_API_URL="http://localhost:3001/api/v1"
```

Nunca publique `.env`, `.env.local`, tokens, senhas reais ou chaves de produção.

### 4. Subir a stack de serviços

```bash
docker compose up -d
docker compose ps
```

Com Podman, substitua `docker compose` por `podman compose`. O Compose inicia a
API, o frontend, o worker e as dependências. Os healthchecks aguardam MySQL e
Mailpit antes da API, e a API antes do frontend. Em uma primeira execução, o
download das imagens e o build podem levar alguns minutos.

Aguarde o MySQL iniciar antes do Prisma. Os serviços locais são:

| Serviço       | Endereço                |
| ------------- | ----------------------- |
| MySQL         | `localhost:3306`        |
| Redis         | `localhost:6379`        |
| MinIO API     | `http://localhost:9000` |
| MinIO Console | `http://localhost:9001` |
| Mailpit       | `http://localhost:8025` |

### 5. Criar o banco e o Prisma Client

```bash
corepack pnpm --filter @loopambiental/database generate
corepack pnpm --filter @loopambiental/database db:push
```

O comando `db:push` sincroniza o schema local sem remover o volume existente.

### 6. Carregar dados demonstrativos

Antes de executar este comando, confirme que o `.env` possui:

```env
DEMO_ADMIN_EMAIL="admin@loopambiental.com"
DEMO_ADMIN_PASSWORD="loopambiental"
```

Depois execute:

```bash
corepack pnpm --filter @loopambiental/database db:demo
```

O comando é idempotente. Ele cria ou atualiza categorias, materiais, usuários,
empresas, oportunidades, propostas, conversas e notificações demonstrativas.

## Executar o Projeto

### Opção A: stack containerizada

Depois de executar `compose up -d`, abra `http://localhost:3000`. A API e o
worker já estão rodando dentro dos containers. Para carregar o banco e os dados
demo, execute os comandos Prisma no host depois que o serviço MySQL estiver
saudável:

```bash
corepack pnpm --filter @loopambiental/database generate
corepack pnpm --filter @loopambiental/database db:push
corepack pnpm --filter @loopambiental/database db:demo
```

No PowerShell, os comandos `corepack pnpm` são iguais. O `.env` do host usa
`localhost`; a API containerizada usa internamente o hostname `mysql`, já
configurado no Compose.

### Opção B: desenvolvimento com Node no host

Use esta opção quando precisar de hot reload. Mantenha somente MySQL, Redis,
MinIO e Mailpit no Compose e execute API, frontend e worker em terminais locais.

#### Windows PowerShell

```powershell
corepack pnpm --filter @loopambiental/api dev
corepack pnpm --filter @loopambiental/web dev
corepack pnpm --filter @loopambiental/worker dev
```

#### Linux/macOS

```bash
corepack pnpm --filter @loopambiental/api dev
corepack pnpm --filter @loopambiental/web dev
corepack pnpm --filter @loopambiental/worker dev
```

Não execute a opção A e a opção B ao mesmo tempo, pois ambas usam as portas
3000 e 3001.

### Opção C: três terminais (atalho)

O frontend separa os artefatos de desenvolvimento (`.next-dev`) e produção
(`.next`). Para desenvolvimento, abra três terminais na raiz do projeto.

Terminal 1, API:

```bash
corepack pnpm --filter @loopambiental/api dev
```

Terminal 2, frontend:

```bash
corepack pnpm --filter @loopambiental/web dev
```

Terminal 3, worker:

```bash
corepack pnpm --filter @loopambiental/worker dev
```

### Opção combinada

```bash
corepack pnpm dev
```

O comando combinado inicia API, web e worker em paralelo. Para logs mais fáceis
de diagnosticar, prefira os três terminais separados.

## Endereços da Aplicação

- Frontend: `http://localhost:3000`
- API: `http://localhost:3001`
- Healthcheck: `http://localhost:3001/api/v1/health`
- Mailpit: `http://localhost:8025`
- MinIO: `http://localhost:9001`

## Credenciais Demo

Todos os usuários abaixo usam a senha `LoopAmbiental123!`, exceto o administrador.

| Perfil              | E-mail                              | Senha           |
| ------------------- | ----------------------------------- | --------------- |
| Comprador principal | `demo.comprador@loopambiental.com`  | `LoopAmbiental123!`   |
| Comprador 2         | `demo.comprador2@loopambiental.com` | `LoopAmbiental123!`   |
| Comprador 3         | `demo.comprador3@loopambiental.com` | `LoopAmbiental123!`   |
| Vendedor principal  | `demo.vendedor@loopambiental.com`   | `LoopAmbiental123!`   |
| Vendedor 2          | `demo.vendedor2@loopambiental.com`  | `LoopAmbiental123!`   |
| Vendedor 3          | `demo.vendedor3@loopambiental.com`  | `LoopAmbiental123!`   |
| Administrador       | `admin@loopambiental.com`           | `loopambiental` |

Essas credenciais são somente para desenvolvimento local. Troque-as antes de
qualquer uso compartilhado ou produção.

## Fluxo Manual Recomendado

1. Abra `http://localhost:3000/anuncios` sem login.
2. Pesquise por `alumínio`, `papelão` ou `PET`.
3. Use os filtros `Quero comprar` e `Quero vender`.
4. Clique no título ou em `Ver detalhes` de uma oportunidade.
5. Confira produto, empresa, responsável, preço, origem, localização e contato.
6. Acesse `Entrar` com um comprador demo.
7. No detalhe de uma oportunidade, envie uma proposta.
8. Acesse `/dashboard/propostas` com a empresa anunciante.
9. Aceite, rejeite ou envie uma contraproposta.
10. Com uma negociação aceita, use `Pagar negociação` ou `Solicitar logística`.
11. Acesse `/dashboard/pagamentos` e `/dashboard/logistica`.
12. Acesse `/admin` com o administrador para consultar usuários, métricas e
    moderação.

## Páginas Principais

### Públicas

```text
/
/como-funciona
/anuncios
/anuncios/[slug]
/empresas
/entrar
/cadastro
/recuperar-senha
/redefinir-senha
/verificar-email
```

### Área autenticada

```text
/dashboard
/dashboard/empresa
/dashboard/anuncios
/dashboard/anuncios/novo
/dashboard/propostas
/dashboard/mensagens
/dashboard/favoritos
/dashboard/notificacoes
/dashboard/pagamentos
/dashboard/logistica
```

### Administração

```text
/admin
/admin/moderacao
```

## Funcionalidades Implementadas

- Cadastro e login com sessão HTTP-only.
- Recuperação e verificação de e-mail via Mailpit local.
- Empresas e membros.
- Contatos com visibilidade `PRIVATE`, `MEMBERS` ou `PUBLIC`.
- CNPJ com hash e armazenamento criptografado.
- Categorias e materiais.
- Anúncios de compra e venda.
- Busca, filtros e paginação.
- Página detalhada da oportunidade.
- Favoritos.
- Propostas, contrapropostas, aceite e rejeição.
- Conversas e mensagens protegidas por participantes.
- Notificações internas.
- Moderação administrativa.
- Dashboard administrativo.
- Checkout Mercado Pago por adapter REST.
- Webhook Mercado Pago com assinatura e idempotência.
- Solicitações logísticas.
- Cotações logísticas manuais.

## Pagamentos Mercado Pago

Para habilitar checkout real, configure no `.env`:

```env
MP_ACCESS_TOKEN="seu-access-token-de-sandbox-ou-producao"
MP_WEBHOOK_SECRET="seu-segredo-de-webhook"
MP_API_URL="https://api.mercadopago.com"
```

O checkout só pode ser criado para uma negociação aceita. O valor é calculado
no servidor a partir da proposta aceita. O frontend não define o valor cobrado.

Webhook:

```text
POST /api/v1/payments/webhook/mercadopago
```

Sem `MP_ACCESS_TOKEN`, a aplicação continua funcionando, mas a criação do
checkout retorna erro de provedor não configurado.

## Logística

A primeira versão usa cotação manual. O comprador ou vendedor cria uma
solicitação com:

- negociação;
- origem;
- destino;
- quantidade;
- unidade;
- janela de coleta;
- requisitos especiais.

Depois, um administrador pode registrar uma cotação de transportador. Os
estados principais são `REQUESTED`, `QUOTED`, `ACCEPTED`, `IN_TRANSIT`,
`COMPLETED` e `CANCELLED`.

## Banco de Dados

O banco oficial é MySQL 8.4. O Prisma está em:

```text
packages/database/prisma/schema.prisma
```

O projeto também possui `schema.sql` para provisionamento manual. O caminho
Prisma é recomendado no desenvolvimento:

```bash
corepack pnpm --filter @loopambiental/database generate
corepack pnpm --filter @loopambiental/database db:validate
corepack pnpm --filter @loopambiental/database db:push
```

Modelos importantes:

- `User`
- `Company`
- `CompanyMember`
- `WasteCategory`
- `Material`
- `Listing`
- `Proposal`
- `Deal`
- `PaymentTransaction`
- `LogisticsRequest`
- `LogisticsQuote`
- `Conversation`
- `Message`
- `Notification`
- `ModerationCase`

O projeto ainda precisa adotar migrations Prisma versionadas antes de produção.

## API Principal

Prefixo:

```text
/api/v1
```

Rotas públicas:

```text
GET /api/v1/health
GET /api/v1/categories
GET /api/v1/materials
GET /api/v1/listings
GET /api/v1/listings/:slug
```

Autenticação:

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
GET  /api/v1/auth/me
POST /api/v1/auth/verify-email
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
```

Negociação:

```text
GET  /api/v1/proposals
POST /api/v1/proposals
POST /api/v1/proposals/:id/counter
POST /api/v1/proposals/:id/accept
POST /api/v1/proposals/:id/reject
POST /api/v1/proposals/:id/cancel
GET  /api/v1/conversations
POST /api/v1/conversations
GET  /api/v1/conversations/:id/messages
POST /api/v1/conversations/:id/messages
```

Pagamentos:

```text
GET  /api/v1/payments
POST /api/v1/payments/checkout
POST /api/v1/payments/webhook/mercadopago
```

Logística:

```text
GET   /api/v1/logistics
POST  /api/v1/logistics/requests
POST  /api/v1/logistics/requests/:id/quotes
PATCH /api/v1/logistics/requests/:id/quotes/:quoteId/accept
```

As rotas de escrita exigem autenticação por cookie HTTP-only. Rotas de
administração exigem `platformRole` compatível.

## Validação Completa

Execute na raiz, sem rodar `dev` ao mesmo tempo que `build`:

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

Validação específica do banco:

```bash
corepack pnpm --filter @loopambiental/database db:validate
```

O frontend ainda não possui testes unitários implementados. O Vitest retorna
sucesso sem arquivos. A API possui testes unitários dos serviços principais.
Testes E2E de navegador continuam pendentes.

## Troubleshooting

### Compose não encontrado

Use o comando correspondente ao runtime instalado:

```bash
docker compose version
podman compose version
```

Se `podman compose` não existir, instale o pacote/provedor Compose da sua
distribuição ou use `podman-compose`. Os comandos do restante deste documento
devem substituir `podman compose` por `podman-compose` nesse caso.

### Container não inicia ou fica `unhealthy`

Confira o estado e os logs de cada serviço:

```bash
docker compose ps
docker compose logs mysql
docker compose logs api
docker compose logs web
```

Com Podman, substitua `docker compose` por `podman compose`. Espere o MySQL
terminar a inicialização na primeira execução. Se o banco já tiver dados de uma
configuração anterior, não remova os volumes antes de investigar.

### Erro de permissão no Podman/Linux

Use rootless como usuário normal e não execute a stack com `sudo` sem uma razão
específica. A configuração usa volumes nomeados para evitar problemas comuns de
ownership e SELinux. Para bind mounts adicionais em hosts SELinux, use `:Z` para
uso exclusivo do container ou `:z` para compartilhamento controlado.

### Porta ocupada no Windows

```powershell
Get-NetTCPConnection -LocalPort 3000,3001,3306,6379 -ErrorAction SilentlyContinue
```

Pare somente o processo responsável ou altere a porta publicada no Compose. Não
altere a porta interna usada pelos serviços sem atualizar as variáveis de ambiente.

### Porta ocupada no Linux/macOS

```bash
ss -ltnp | grep -E ':3000|:3001|:3306|:6379|:9000|:9001|:1025|:8025'
```

Pare somente o processo do projeto que estiver ocupando a porta.

### API não inicia

Confirme que `.env` existe na raiz e contém `DATABASE_URL`. Confira:

```bash
docker compose ps
curl http://localhost:3001/api/v1/health
```

### MySQL não conecta

```bash
docker compose ps mysql
docker compose logs mysql
```

Aguarde alguns segundos na primeira inicialização. A URL local deve usar
`localhost:3306`.

### Prisma retorna `EPERM` no Windows

Pare API, web e worker antes de regenerar o client:

```powershell
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
  Where-Object { $_.CommandLine -like '*apps\\api*' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
corepack pnpm --filter @loopambiental/database generate
```

### Frontend retorna erro de webpack

Não execute `next build` junto com `next dev`. Pare o frontend e limpe somente o
artefato gerado:

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
Remove-Item -Recurse -Force apps/web/.next-dev
corepack pnpm --filter @loopambiental/web dev
```

### E-mails não aparecem

Em desenvolvimento, a recuperação de senha não entrega mensagens em caixas
externas: o SMTP local captura os e-mails no Mailpit. Abra
`http://localhost:8025` e procure por `Redefina sua senha na LOOP AMBIENTAL`.
Confirme `SMTP_HOST=localhost` e `SMTP_PORT=1025` no `.env`. Em staging ou
produção, substitua esses valores pelos dados de um provedor SMTP real.

### Porta ocupada

Windows:

```powershell
Get-NetTCPConnection -LocalPort 3000,3001 -State Listen
```

Linux/macOS:

```bash
lsof -i :3000
lsof -i :3001
```

Pare somente o processo do projeto que estiver ocupando a porta.

## Parar e Limpar

Parar containers preservando volumes:

```bash
docker compose stop
```

Remover containers preservando volumes:

```bash
docker compose down
```

Não use `docker compose down -v` sem confirmação. Esse comando remove o banco
local e os arquivos do MinIO.

## Estrutura

```text
apps/web                 Frontend Next.js
apps/api                 API NestJS
apps/worker              Worker de jobs
packages/database        Prisma schema e client
docker-compose.yml       Stack local Podman/Docker
infra/docker              Containerfiles OCI da aplicação
schema.sql               Provisionamento manual MySQL
```

## Pendências Antes de Produção

- Migrations Prisma versionadas.
- Worker BullMQ real.
- Rate limiting e headers de segurança completos.
- Observabilidade centralizada.
- Upload seguro em MinIO/S3 com scanner.
- Testes E2E Playwright.
- Pagamento Mercado Pago com credenciais e sandbox validados.
- Gestão administrativa de cotações logísticas.
- Backups, retenção e plano de rollback.
- Revisão LGPD e políticas legais da operação.
