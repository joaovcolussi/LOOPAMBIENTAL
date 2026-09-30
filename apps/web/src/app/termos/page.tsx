import { Recycle } from 'lucide-react';
import { SessionActions } from '../../components/session-actions';

export const metadata = { title: 'Termos de uso | LOOP AMBIENTAL' };

export default function TermsPage() {
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
        <h1>Termos de uso</h1>
        <p className="legal-note">
          Versão de demonstração. Este texto deve ser substituído pela redação
          jurídica revisada antes de qualquer uso em produção.
        </p>

        <h2>1. Aceitação</h2>
        <p>
          Ao criar uma conta e utilizar a LOOP AMBIENTAL, você declara ter
          autoridade para representar a empresa informada e concorda com estes
          termos.
        </p>

        <h2>2. Natureza da plataforma</h2>
        <p>
          A LOOP AMBIENTAL é um ambiente de intermediação que aproxima empresas
          interessadas em comprar e vender resíduos, recicláveis, sucatas e
          subprodutos. A plataforma não é parte da negociação celebrada entre os
          usuários, salvo quando indicado de forma expressa.
        </p>

        <h2>3. Responsabilidades do usuário</h2>
        <p>
          O usuário é responsável pela veracidade das informações dos anúncios e
          documentos enviados, pelo cumprimento das normas ambientais e pela
          regularidade da operação, incluindo licenças, transporte e destinação
          do material.
        </p>

        <h2>4. Condutas vedadas</h2>
        <p>
          É proibido publicar conteúdo falso, material ilícito, usar dados de
          contato de terceiros de forma indevida ou tentar contornar os
          mecanismos de segurança e de moderação da plataforma.
        </p>

        <h2>5. Moderação e suspensão</h2>
        <p>
          A LOOP AMBIENTAL pode revisar anúncios e documentos, recusar conteúdos
          e suspender contas que violem estes termos ou a legislação aplicável.
        </p>

        <h2>6. Planos e comissões</h2>
        <p>
          Planos e comissões são informados na página de planos e podem ser
          ajustados com aviso prévio. Operações concluídas podem ser objeto de
          comissão conforme a faixa vigente.
        </p>

        <h2>7. Contato</h2>
        <p>
          Dúvidas sobre estes termos podem ser encaminhadas pelos canais de
          atendimento da plataforma.
        </p>
      </section>
    </main>
  );
}
