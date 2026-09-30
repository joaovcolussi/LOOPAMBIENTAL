import { Recycle } from 'lucide-react';
import { SessionActions } from '../../components/session-actions';

export const metadata = { title: 'Privacidade | LOOP AMBIENTAL' };

export default function PrivacyPage() {
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
        <p className="eyebrow">documento legal</p>
        <h1>Política de privacidade</h1>
        <p className="legal-note">
          Versão de demonstração. Este texto deve ser substituído pela redação
          jurídica revisada e alinhada à LGPD antes de qualquer uso em produção.
        </p>

        <h2>1. Dados tratados</h2>
        <p>
          Tratamos dados de identificação e contato, dados da empresa,
          informações de anúncios, propostas, mensagens, documentos de
          verificação e registros de uso da plataforma.
        </p>

        <h2>2. Finalidades</h2>
        <p>
          Os dados são usados para operar o marketplace, viabilizar negociações,
          verificar empresas, prevenir fraudes, cumprir obrigações legais e
          melhorar a experiência.
        </p>

        <h2>3. Compartilhamento</h2>
        <p>
          Dados de contato podem ser exibidos conforme a visibilidade definida
          pela empresa. Dados sensíveis, como documentos e identificadores, são
          acessados apenas pela própria empresa e pela análise da plataforma.
        </p>

        <h2>4. Segurança</h2>
        <p>
          Aplicamos criptografia de dados sensíveis, controle de acesso por
          papel, sessões seguras, validação de uploads e registro de auditoria
          das ações administrativas.
        </p>

        <h2>5. Direitos do titular</h2>
        <p>
          O titular pode solicitar confirmação de tratamento, acesso, correção,
          anonimização, portabilidade e exclusão quando legalmente aplicável.
        </p>

        <h2>6. Retenção</h2>
        <p>
          Dados podem ser mantidos por período necessário ao cumprimento de
          obrigações legais, à prevenção de fraude e à preservação do histórico
          comercial.
        </p>

        <h2>7. Contato</h2>
        <p>
          Solicitações relacionadas à privacidade podem ser feitas pelos canais
          de atendimento da plataforma.
        </p>
      </section>
    </main>
  );
}
