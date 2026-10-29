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

### 3. Usar as contas de demonstração

Este projeto roda como **ambiente de estudo/demonstração**: o `pnpm start`
carrega dados fictícios (empresas, anúncios, propostas, negociações, fretes e
pagamentos) e todos os pagamentos são **simulados** — nenhuma cobrança real é
feita. Senha de todas as contas: `Demo@12345`.

| Conta                          | Perfil                                     |
| ------------------------------ | ------------------------------------------ |
| `admin@loopambiental.demo`     | Administrador da plataforma                |
| `moderacao@loopambiental.demo` | Moderador                                  |
| `ana@reciclasul.demo`          | Recicla Sul Metais (verificada, plano Pro) |
| `bruno@polimerosverdes.demo`   | Polímeros Verdes (compra plástico)         |
| `carla@papelcircular.demo`     | Papel Circular (verificação em análise)    |
| `diego@horizonte.demo`         | Construtora Horizonte (não verificada)     |

Para recarregar só os dados: `corepack pnpm db:demo` (idempotente). Para não
carregá-los no `start`, defina `DEMO_SEED=false`.

Fluxo completo para testar: proposta → aceite → **Negociações** → _Pagar_ →
checkout simulado (_Aprovar pagamento_) → **Logística** → _Gerar cotações
simuladas_ → _Contratar_ → _Simular próximo evento de rastreio_ → negociação
entregue → _Concluir_ → avaliação. Assinaturas pagas e desbloqueio avulso de
contato também passam pelo checkout simulado.

### 4. Tornar-se administrador (conta própria)

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
| `corepack pnpm db:demo`     | Carrega dados fictícios de demonstração      |
| `corepack pnpm test`        | Testes unitários (API e Web)                 |
| `corepack pnpm lint`        | Verifica formatação                          |
| `corepack pnpm typecheck`   | Verifica tipos                               |
| `corepack pnpm build`       | Build de produção                            |
| `corepack pnpm test:e2e`    | Testes E2E (Playwright, com a stack rodando) |

## Endereços

| Serviço          | Endereço                              |
| ---------------- | ------------------------------------- |
| Site             | http://localhost:3000                 |
| API              | http://localhost:3001/api/v1          |
| Saúde da API     | http://localhost:3001/api/v1/health   |
| Métricas         | http://localhost:3001/api/v1/metrics  |
| Docs da API      | http://localhost:3000/desenvolvedores |
| E-mails (dev)    | http://localhost:8025                 |
| MinIO (arquivos) | http://localhost:9001                 |

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
- Moderação, denúncias, notificações em **tempo real** (SSE), avaliações.
- Planos, assinaturas e desbloqueio de contato cobrados por pagamento
  (simulado na demo; Mercado Pago via `PAYMENT_PROVIDER=mercadopago`).
- Negociações com máquina de estados (documentos, pagamento, coleta, entrega,
  conclusão, disputa) e logística com cotações, remessas e rastreio.
- Atributos técnicos por categoria (pureza, polímero, umidade...) com filtros.
- Relatórios comerciais e ambientais (CO₂e estimado) com exportação CSV.
- Recomendações de ofertas, chaves de API e importação/exportação CSV para ERP.
- MFA (TOTP), verificação de e-mail obrigatória, sessões, exportação e
  exclusão de dados (LGPD), aceite versionado de termos.
- Observabilidade (logs JSON, `requestId`, `traceparent`, métricas
  Prometheus), CSP e varredura de uploads (assinaturas, inclui EICAR).
- App instalável (PWA) e seletor de idioma (pt-BR, en, es nas páginas públicas).
- Painel administrativo com indicadores, disputas, logística, LGPD e auditoria.

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

- Desligar a demonstração: `DEMO_MODE=false`, `DEMO_SEED=false`,
  `NEXT_PUBLIC_DEMO_MODE=false` e cadastrar os planos reais.
- `PAYMENT_PROVIDER=mercadopago` com credenciais `MP_*` e `API_PUBLIC_URL` pública.
- `REQUIRE_ADMIN_MFA=true`, `METRICS_TOKEN`, antivírus real no adapter de
  varredura, Redis pub/sub para o tempo real com várias instâncias, backups e
  revisão jurídica de termos/privacidade.
