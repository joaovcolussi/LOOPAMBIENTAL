# LOOP AMBIENTAL

Marketplace B2B para compra, venda e negociação de resíduos, recicláveis,
sucatas e materiais reaproveitáveis.

## O que está implementado

- Cadastro, login, recuperação e verificação de e-mail.
- Empresas, membros e contatos com controle de visibilidade.
- Categorias, materiais e anúncios de compra ou venda.
- Busca, filtros, favoritos e paginação.
- Propostas, contrapropostas, negociações e mensagens.
- Notificações, moderação, pagamentos e solicitações logísticas.
- Painel administrativo com indicadores, permissões, moderação e gestão do
  carrossel da página inicial.
- Fotos privadas de anúncios e imagens administrativas armazenadas em MinIO.
- API NestJS, frontend Next.js, worker e banco MySQL com Prisma.

Pagamentos Mercado Pago e envio de e-mail real dependem de credenciais externas.
Em desenvolvimento, os e-mails são capturados pelo Mailpit.

## Requisitos

Escolha uma opção:

| Ambiente | Containers                       | Terminal   |
| -------- | -------------------------------- | ---------- |
| Windows  | Docker Desktop ou Podman Machine | PowerShell |
| Linux    | Docker Engine ou Podman rootless | Bash       |
| macOS    | Docker Desktop ou Podman Machine | Terminal   |

Para desenvolvimento com hot reload, instale também:

- Node.js 22 ou 24 LTS.
- Corepack e pnpm `9.15.5`.
- Git.
- Aproximadamente 8 GB de RAM.

Confirme as ferramentas:

```bash
node --version
corepack pnpm --version
docker compose version
```

Com Podman, substitua `docker compose version` por `podman compose version`. As
portas `3000`, `3001`, `3306`, `6379`, `9000`, `9001`, `1025` e `8025` precisam
estar livres.

## Instalação

Clone o projeto e instale as dependências:

```bash
git clone https://github.com/joaovcolussi/LOOPAMBIENTAL.git
cd LOOPAMBIENTAL
corepack enable
corepack pnpm install
```

Crie os arquivos de ambiente.

Windows PowerShell:

```powershell
Copy-Item .env.example .env
Copy-Item apps/web/.env.example apps/web/.env.local
```

Linux/macOS:

```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
```

Para desenvolvimento local, os valores padrão dos arquivos de exemplo são
suficientes. Nunca publique `.env`, `.env.local`, tokens ou senhas reais.

## Executar com Docker ou Podman

### Linux com Podman

No Linux nativo, execute como usuário normal:

```bash
podman compose build
podman compose up -d
podman compose ps
```

No Windows ou macOS, inicialize a máquina Podman uma vez:

```bash
podman machine init
podman machine start
podman compose build
podman compose up -d
```

Se a máquina já existir, ignore o erro do `podman machine init` e execute apenas
`podman machine start`.

### Docker

```bash
docker compose build
docker compose up -d
docker compose ps
```

O Compose inicia API, frontend, worker, MySQL, Redis, MinIO e Mailpit. Os
healthchecks aguardam as dependências antes de liberar API e frontend.

### Criar o banco e dados demo

Depois que o MySQL estiver saudável, execute na raiz do projeto:

```bash
corepack pnpm --filter @loopambiental/database generate
corepack pnpm --filter @loopambiental/database db:push
corepack pnpm --filter @loopambiental/database db:demo
```

Esses comandos usam `localhost` no host. Dentro dos containers, a API usa o
hostname interno `mysql`, já configurado no Compose.

O diretório `packages/database/prisma/migrations` contém a linha de base para
novos ambientes. Bancos locais criados anteriormente com `db:push` devem
continuar usando `db:push`; antes de adotar `prisma migrate deploy` em um banco
existente, registre a linha de base com `prisma migrate resolve --applied
20260902000000_baseline` após validar que o schema está sincronizado e execute
`prisma migrate deploy` para aplicar as migrações incrementais seguintes.

### Endereços

| Serviço       | Endereço                              |
| ------------- | ------------------------------------- |
| Frontend      | `http://localhost:3000`               |
| API           | `http://localhost:3001`               |
| Healthcheck   | `http://localhost:3001/api/v1/health` |
| Mailpit       | `http://localhost:8025`               |
| MinIO Console | `http://localhost:9001`               |

### Administração

O painel administrativo fica em `http://localhost:3000/admin` e reúne:

- indicadores de usuários, empresas, anúncios, propostas e negociações;
- volume comercial, pipeline e estimativa de comissão;
- distribuição por status e categoria;
- gestão dos 100 usuários mais recentes e seus papéis de plataforma;
- fila de moderação em `/admin/moderacao`;
- substituição das quatro imagens do carrossel em `/admin/carrossel`.

Somente administradores podem alterar papéis e o carrossel. Administradores e
moderadores podem decidir casos de moderação. Todas essas mutações exigem sessão,
origem válida e são registradas na tabela `audit_logs` quando aplicável.

As posições sem imagem personalizada usam as ilustrações incluídas no frontend.
Imagens enviadas são limitadas a 5 MB, decodificadas e convertidas para WebP
antes da publicação. O bucket permanece privado e a API entrega somente o
conteúdo permitido.

### Parar e limpar

```bash
docker compose stop
docker compose down
```

Com Podman, substitua `docker compose` por `podman compose`. Não use `down -v`
sem confirmação: ele apaga os volumes locais do MySQL e MinIO.

## Desenvolvimento com hot reload

Use apenas as dependências de infraestrutura:

```bash
docker compose up -d mysql redis minio mailpit
```

Com Podman, substitua `docker compose` por `podman compose`. Em seguida, abra
três terminais na raiz:

Terminal 1:

```bash
corepack pnpm --filter @loopambiental/api dev
```

Terminal 2:

```bash
corepack pnpm --filter @loopambiental/web dev
```

Terminal 3:

```bash
corepack pnpm --filter @loopambiental/worker dev
```

Ou inicie os três processos em paralelo:

```bash
corepack pnpm dev
```

Não use o modo containerizado e o modo hot reload ao mesmo tempo, pois ambos
usam as portas `3000` e `3001`.

## Credenciais demo

O seed cria usuários de demonstração. A senha dos usuários comuns é
`LoopAmbiental123!`. O administrador usa os valores de `DEMO_ADMIN_EMAIL` e
`DEMO_ADMIN_PASSWORD` definidos no `.env`.

Essas credenciais são somente para desenvolvimento local.

## Variáveis importantes

O arquivo `.env.example` contém todos os nomes usados pela API. Os principais:

```env
DATABASE_URL="mysql://loopambiental:loopambiental_local@localhost:3306/loopambiental"
PORT=3001
WEB_ORIGIN="http://localhost:3000"
SMTP_HOST="localhost"
SMTP_PORT=1025
WEB_PUBLIC_URL="http://localhost:3000"
FIELD_ENCRYPTION_KEY="configure-a-strong-secret-in-production"
STORAGE_ENDPOINT="http://localhost:9000"
STORAGE_BUCKET="loopambiental-listings"
STORAGE_ACCESS_KEY="loopambiental"
STORAGE_SECRET_KEY="loopambiental_local"
```

Para habilitar checkout Mercado Pago, configure também `MP_ACCESS_TOKEN`,
`MP_WEBHOOK_SECRET` e `MP_API_URL`.

As fotos de anúncios são armazenadas no MinIO local. A API aceita até cinco
imagens JPEG, PNG ou WebP de 5 MB, decodifica e converte o conteúdo para WebP e
mantém os objetos privados. Somente fotos de anúncios publicados têm leitura
pública; prévias e moderação exigem sessão autorizada.

No fluxo inicial de negociação, a empresa anunciante pode enviar uma
contraproposta e a empresa proponente pode aceitá-la ou rejeitá-la. Rodadas
alternadas adicionais ficam fora deste primeiro fluxo para manter explícita a
parte responsável pela próxima decisão.

## Comandos de validação

Execute na raiz:

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm --filter @loopambiental/database db:validate
```

A API possui testes unitários. O frontend ainda não possui testes unitários e os
testes E2E continuam pendentes.

## Diagnóstico

Ver estado e logs:

```bash
docker compose ps
docker compose logs api
docker compose logs web
docker compose logs mysql
```

Com Podman, substitua `docker compose` por `podman compose`.

Se a API não iniciar:

1. Confirme que o MySQL está `healthy`.
2. Verifique se `DATABASE_URL` existe no `.env`.
3. Execute `db:push` antes de usar os dados da aplicação.
4. Consulte `http://localhost:3001/api/v1/health`.

Se houver erro de permissão no Linux com SELinux, prefira os volumes nomeados já
configurados. Para adicionar bind mounts, use `:Z` quando o volume for exclusivo
do container ou `:z` quando for compartilhado.

Para verificar portas no Windows PowerShell:

```powershell
Get-NetTCPConnection -LocalPort 3000,3001,3306,6379 -ErrorAction SilentlyContinue
```

Para Linux/macOS:

```bash
ss -ltnp | grep -E ':3000|:3001|:3306|:6379|:9000|:9001|:1025|:8025'
```

## Estrutura

```text
apps/api          API NestJS
apps/web          Frontend Next.js
apps/worker       Worker de jobs
packages/database Prisma schema e client
infra/docker      Containerfiles OCI
docker-compose.yml Stack local Docker/Podman
schema.sql        Provisionamento manual MySQL
```

## Pendências antes de produção

- Worker BullMQ real.
- Rate limiting e observabilidade completos.
- Upload seguro com scanner.
- Testes E2E.
- Validação de pagamentos em sandbox.
- Backups, retenção e plano de rollback.
- Revisão jurídica e LGPD.
