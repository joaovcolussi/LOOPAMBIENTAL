# Auditoria geral — LOOP AMBIENTAL

Data: 2026-09-30
Escopo: API NestJS, frontend Next.js, banco, fluxos. Revisão estática + fluxo E2E.

## 1. Fluxo completo validado

Fluxo testado de ponta a ponta (25/25 etapas) e depois convertido em E2E
(`e2e/full-flow.spec.ts`), cobrindo:

1. catálogo de referência; 2. registro do vendedor; 3. criação de empresa;
4. criação de anúncio; 5. upload de imagem; 6. envio para análise;
7. aprovação na moderação; 8. busca pública; 9. leitura pública da imagem;
10. registro do comprador; 11. empresa compradora; 12. proposta;
13. aceite (negociação); 14. conversa; 15. mensagem; 16. leitura de mensagens;
17. notificações; 18. checkout (adapter); 19. logística; 20. favoritos;
21. busca salva; 22. denúncia; 23. verificação de empresa; 24. logout.

Observação: favoritar exige anúncio `PUBLISHED`; após o aceite o anúncio vira
`NEGOTIATING`, comportamento correto.

## 2. Correções aplicadas nesta rodada

| ID | Severidade | Correção |
| --- | --- | --- |
| C1 | Crítico | `FIELD_ENCRYPTION_KEY` obrigatória em produção (sem fallback público em `companies.service.ts`). |
| — | Crítico | Open redirect em `auth-form.tsx`: `next` restrito a caminho relativo. |
| A1 (front) | Alto | Novo `apps/web/src/app/admin/layout.tsx` exige `ADMIN`/`MODERATOR`. |
| A2 | Alto | `ADMIN_EMAILS` só concede admin/moderação a contas com e-mail verificado. |
| A1 (rate) | Alto | `@nestjs/throttler` global + limite agressivo em endpoints de autenticação. |
| M1 | Médio | Login sem timing oracle (hash dummy para usuário inexistente). |
| M3 | Médio | Link do Mailpit só em desenvolvimento. |
| A2 (front) | Alto | Retry da busca realmente refaz a requisição (`reloadKey`). |
| A4 (front) | Alto | Tratamento de erro em notificações e redirecionamentos com `next`. |
| M9 | Médio | `error.tsx` e `not-found.tsx` adicionados. |
| M6 | Médio | `CurrencyInput` sem `aria-label` conflitante com o label visível. |
| B2/B3 | Baixo | Redirecionamentos preservam `next`; texto com acentuação corrigido. |

## 3. Pendências de segurança (backlog)

- A2 (e-mail): exigir verificação de e-mail para login/recuperação plena.
- A3: rotação de token de sessão e expiração absoluta; cookie `__Host-`.
- A4 (enumeração): resposta neutra no cadastro.
- M2: scanner assíncrono de uploads (fila `file-scan`).
- M4: `helmet` (CSP/HSTS) e redigir PII em logs.
- M5: proteção anti-CSRF também nas mutações de autenticação.

## 4. Pendências de UX/acessibilidade (backlog)

- Substituir `window.prompt`/`confirm` por modais acessíveis.
- Associar erros de formulário aos campos (`aria-describedby`/`aria-invalid`).
- Restaurar filtros no back/forward e evitar fetch duplicado na busca.
- Navegação por teclado nos radiogroups de estrelas.
- `caption` em tabelas administrativas; nav mobile com menu.

## 5. O que está correto

- Autorização/IDOR sistemática; guardas em todos os endpoints privados.
- Hash scrypt + `timingSafeEqual`; tokens só em hash.
- Uploads com allowlist por conteúdo, limites e chaves aleatórias.
- SQL raw sempre parametrizado.
- Erros padronizados com `requestId`; sem vazamento de stack ao cliente.
- `passwordHash` e CNPJ cifrado nunca expostos diretamente.
