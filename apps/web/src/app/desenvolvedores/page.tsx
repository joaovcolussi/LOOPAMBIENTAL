import { Code2, KeyRound, Recycle } from 'lucide-react';
import { SessionActions } from '../../components/session-actions';

export const metadata = {
  title: 'API para desenvolvedores | LOOP AMBIENTAL',
  description:
    'Integre seu ERP à LOOP AMBIENTAL: chaves de API, endpoints de anúncios e negociações e importação CSV.',
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

const endpoints = [
  {
    method: 'GET',
    path: '/integrations/company',
    description: 'Dados públicos da empresa dona da chave.',
  },
  {
    method: 'GET',
    path: '/integrations/listings',
    description: 'Anúncios da empresa (até 500, mais recentes primeiro).',
  },
  {
    method: 'GET',
    path: '/integrations/deals',
    description: 'Negociações em que a empresa é compradora ou vendedora.',
  },
  {
    method: 'POST',
    path: '/integrations/listings/import',
    description:
      'Cria anúncios em rascunho a partir de CSV ({ "csv": "...", "submit": false }).',
  },
  {
    method: 'GET',
    path: '/listings',
    description:
      'Busca pública do marketplace (sem chave): q, type, categoryId, state, attr, cursor.',
  },
];

export default function DevelopersPage() {
  return (
    <main>
      <nav className="nav shell">
        <a className="brand" href="/">
          <Recycle size={22} /> LOOP <span>AMBIENTAL</span>
        </a>
        <div className="nav-actions">
          <SessionActions />
        </div>
      </nav>
      <section className="legal-page shell">
        <p className="eyebrow">
          <Code2 size={14} aria-hidden="true" /> API pública
        </p>
        <h1>Integre seu ERP à LOOP AMBIENTAL</h1>
        <p className="section-lede">
          API REST versionada em <code>/api/v1</code>, respostas JSON, datas em
          ISO 8601 (UTC) e erros estruturados com <code>requestId</code>. Este
          ambiente é de demonstração: use apenas dados fictícios.
        </p>

        <h2>
          <KeyRound size={18} aria-hidden="true" /> Autenticação
        </h2>
        <p>
          Gere uma chave em{' '}
          <a className="text-link" href="/dashboard/integracoes">
            Painel → Integrações e API
          </a>{' '}
          (proprietários e administradores da empresa). Envie-a no cabeçalho{' '}
          <code>X-Api-Key</code>. A chave age em nome de quem a criou, é exibida
          uma única vez e pode ser revogada a qualquer momento. Cookies não são
          aceitos nessas rotas.
        </p>
        <pre className="code-block">{`curl -s ${API_URL}/integrations/listings \\
  -H "X-Api-Key: la_demo_SUA_CHAVE"`}</pre>

        <h2>Endpoints</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Método</th>
                <th>Rota</th>
                <th>Descrição</th>
              </tr>
            </thead>
            <tbody>
              {endpoints.map((endpoint) => (
                <tr key={`${endpoint.method} ${endpoint.path}`}>
                  <td>
                    <code>{endpoint.method}</code>
                  </td>
                  <td>
                    <code>{endpoint.path}</code>
                  </td>
                  <td>{endpoint.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2>Importação em lote (CSV)</h2>
        <p>
          Separador <code>;</code> ou <code>,</code>, codificação UTF-8, até 100
          linhas. Colunas obrigatórias: <code>tipo</code> (COMPRA ou VENDA),{' '}
          <code>titulo</code>, <code>categoria</code> (slug, ex.: plastico),{' '}
          <code>quantidade</code> e <code>unidade</code>. Opcionais:{' '}
          <code>preco_unitario</code>, <code>cidade</code>, <code>estado</code>,{' '}
          <code>descricao</code>. Cada linha inválida é reportada sem bloquear
          as demais.
        </p>
        <pre className="code-block">{`curl -s -X POST ${API_URL}/integrations/listings/import \\
  -H "X-Api-Key: la_demo_SUA_CHAVE" \\
  -H "Content-Type: application/json" \\
  -d '{"csv":"tipo;titulo;categoria;quantidade;unidade\\nVENDA;Aparas de PET;plastico;800;kg"}'`}</pre>

        <h2>Erros</h2>
        <pre className="code-block">{`{
  "error": {
    "code": "INVALID_API_KEY",
    "message": "INVALID_API_KEY",
    "details": [],
    "requestId": "2f1c..."
  }
}`}</pre>
        <p>
          Toda resposta inclui <code>X-Request-Id</code> e{' '}
          <code>traceparent</code> para correlação com o suporte. Há limite de
          requisições por IP; em caso de excesso a API responde <code>429</code>
          .
        </p>
      </section>
    </main>
  );
}
