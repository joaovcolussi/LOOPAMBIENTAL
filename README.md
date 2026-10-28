# LOOP AMBIENTAL

Marketplace B2B para comprar e vender resíduos, recicláveis, sucatas e materiais
reaproveitáveis. Os comandos abaixo são iguais no **Windows** (PowerShell ou
CMD) e no **Linux** (ou macOS).

## Rodar em outra máquina (5 minutos)

### 1. Instale uma vez

| Ferramenta                                 | Windows                          | Linux (Ubuntu/Debian)                                      |
| ------------------------------------------ | -------------------------------- | ---------------------------------------------------------- |
| [Node.js 22 LTS](https://nodejs.org) ou 24 | instalador `.msi`                | `nvm install 22` ou pacote da distribuição                 |
| [Git](https://git-scm.com)                 | instalador                       | `sudo apt install git`                                     |
| Docker **ou** Podman                       | Docker Desktop ou Podman Desktop | `sudo apt install docker.io docker-compose-v2` ou `podman` |

Deixe o Docker Desktop (ou a máquina Podman) **aberto** antes de continuar. No
Linux, adicione seu usuário ao grupo `docker` (`sudo usermod -aG docker $USER`
e entre de novo) ou use Podman rootless.

### 2. Baixe e inicie

```bash
git clone https://github.com/joaovcolussi/LOOPAMBIENTAL.git
cd LOOPAMBIENTAL
corepack enable
corepack pnpm install
corepack pnpm start
```

Abra **http://localhost:3000** e crie sua conta em `/cadastro`.

O `start` faz tudo sozinho: cria o `.env` (com chave de criptografia própria),
sobe MySQL, Redis, MinIO e Mailpit, aplica as migrações e inicia API, Web e
Worker com recarga automática. `Ctrl+C` encerra os apps; `corepack pnpm stop`
para os containers (os dados ficam salvos).

> No Windows, se `corepack enable` pedir permissão, abra o terminal como
> administrador só para esse comando.

### 3. Tornar-se administrador

O e-mail `admin@loopambiental.com` já está em `ADMIN_EMAILS` no `.env`. Cadastre
esse e-mail (ou troque a variável pelo seu), confirme o e-mail no Mailpit
(http://localhost:8025) e acesse http://localhost:3000/admin.

## Comandos do dia a dia

| Comando                     | O que faz                                    |
| --------------------------- | -------------------------------------------- |
| `corepack pnpm start`       | Sobe tudo (infra + migrações + apps)         |
| `corepack pnpm stop`        | Para os containers, mantendo os dados        |
| `corepack pnpm start:infra` | Sobe só MySQL, Redis, MinIO e Mailpit        |
| `corepack pnpm dev`         | Inicia só os apps (infra já rodando)         |
| `corepack pnpm db:migrate`  | Aplica migrações novas                       |
| `corepack pnpm test`        | Testes unitários (API e Web)                 |
| `corepack pnpm lint`        | Verifica formatação                          |
| `corepack pnpm typecheck`   | Verifica tipos                               |
| `corepack pnpm build`       | Build de produção                            |
| `corepack pnpm test:e2e`    | Testes E2E (Playwright, com a stack rodando) |

## Endereços

| Serviço          | Endereço                            |
| ---------------- | ----------------------------------- |
| Site             | http://localhost:3000               |
| API              | http://localhost:3001/api/v1        |
| Saúde da API     | http://localhost:3001/api/v1/health |
| E-mails (dev)    | http://localhost:8025               |
| MinIO (arquivos) | http://localhost:9001               |

## Problemas comuns

| Sintoma                                   | Solução                                                                             |
| ----------------------------------------- | ----------------------------------------------------------------------------------- |
| "Docker Compose ou Podman não encontrado" | Abra o Docker Desktop / `podman machine start` e rode de novo.                      |
| Porta ocupada (3000, 3001, 3306...)       | Feche o programa que usa a porta ou rode `corepack pnpm stop`.                      |
| Erros de tipo do Prisma                   | `corepack pnpm db:generate`                                                         |
| MySQL não fica "healthy"                  | `docker compose logs mysql` (ou `podman compose logs mysql`).                       |
| Lint acusa todos os arquivos no Windows   | O repositório força LF; reclone ou rode `git add --renormalize .`.                  |
| Forçar Podman em vez de Docker            | Windows: `$env:COMPOSE="podman compose"` · Linux: `export COMPOSE="podman compose"` |

Para ver as portas em uso: `Get-NetTCPConnection -LocalPort 3000,3001,3306`
(PowerShell) ou `ss -ltnp | grep -E ':3000|:3001|:3306'` (Linux).

## O que o sistema faz

- Cadastro, login, verificação de e-mail e recuperação de senha.
- Empresas, membros, convites e verificação documental (CNPJ, licenças).
- Anúncios de **compra** e **venda** com fotos e **laudos técnicos**.
- Busca com texto, filtros, distância, favoritos e buscas salvas.
- Propostas, contrapropostas, negociações e chat.
- Moderação, denúncias, notificações, avaliações, planos e pagamentos
  (Mercado Pago).
- Painel administrativo com indicadores e auditoria.

### Laudos nos anúncios

Ao criar ou editar um anúncio (compra ou venda), use a seção **Laudos e
documentos técnicos**: escolha o tipo (laudo técnico, análise laboratorial,
FDS/FISPQ ou outro), a validade opcional e o arquivo.

- Até 5 laudos por anúncio; PDF, JPEG, PNG ou WebP com até 10 MB.
- O download exige login. Rascunhos ficam visíveis só para a empresa; durante a
  negociação, a empresa com proposta aceita mantém o acesso.
- Adicionar ou remover laudo de anúncio publicado o devolve para a moderação.
- Laudos vencidos aparecem destacados.

## Rodar tudo em containers (opcional)

Para simular produção (API, Web e Worker também em containers):

```bash
docker compose up -d --build
corepack pnpm db:migrate
```

Antes, garanta que o `.env` existe com uma `FIELD_ENCRYPTION_KEY` própria (o
`corepack pnpm start` cria; para gerar à mão:
`node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`).
Não troque essa chave depois de cadastrar empresas: os CNPJs ficariam ilegíveis.

## Estrutura

```text
apps/api            API NestJS (REST /api/v1)
apps/web            Site Next.js
apps/worker         Tarefas assíncronas (outbox + BullMQ)
packages/database   Prisma: schema, migrações e client
infra/scripts       start.mjs (inicialização em Windows/Linux/macOS)
infra/docker        Imagens de produção
e2e                 Testes Playwright
```

Variáveis de ambiente: veja `.env.example`. Regras
de arquitetura e de contribuição: `AGENTS.md`.

## Antes de ir para produção

- Cadastrar os planos reais (hoje não há planos no banco).
- Credenciais do Mercado Pago (`MP_*`) e `API_PUBLIC_URL` pública.
- MFA para administradores, antivírus para uploads, backups e revisão LGPD.
