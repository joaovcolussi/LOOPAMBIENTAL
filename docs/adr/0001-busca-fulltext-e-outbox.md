# ADR 0001 — Busca FULLTEXT e transactional outbox

- Status: aceito
- Data: 2026-09-30

## Contexto

O MVP precisava de busca pública relevante (ranking, facetas e paginação) e de
um mecanismo confiável para tarefas assíncronas (e-mails transacionais e eventos
de domínio) sem acoplar a conclusão da transação de negócio ao envio externo.

## Decisões

### Busca

- Usar o índice MySQL `FULLTEXT` em `listings(title, description)`, criado por
  migration SQL (`20260930260000_add_plans_outbox_fulltext`), pois o Prisma não
  representa índices `FULLTEXT`.
- Buscar com `MATCH ... AGAINST (... IN NATURAL LANGUAGE MODE)` para ranking.
- Oferecer facetas de categoria, tipo e estado calculadas sobre o mesmo conjunto
  filtrado.
- Paginar por cursor quando não há termo (ordenação por recência) e por offset
  determinístico quando há ranking, porque a relevância do MySQL é um número de
  ponto flutuante e nem toda igualdade seria segura em um cursor.

### Transactional outbox

- Gravar eventos em `outbox_events` na mesma transação da mudança de domínio.
- Processar no worker via BullMQ + Redis (`REDIS_URL`). Sem Redis, o worker
  processa por polling no mesmo processo, mantendo o fluxo funcional em
  desenvolvimento e no CI.
- Handlers idempotentes por natureza (e-mails) com retry, backoff e limite de
  tentativas; eventos sem handler são registrados como processados com aviso.

## Consequências

- `prisma migrate dev` pode sinalizar divergência por causa do índice FULLTEXT
  gerenciado fora do schema; implantações usam `prisma migrate deploy`.
- O full-text depende do MySQL; a migração para OpenSearch/Meilisearch fica para
  quando houver métricas que a justifiquem.
- O outbox adiciona uma tabela e um processo (worker) a operar, em troca de
  confiabilidade e desacoplamento das integrações externas.
