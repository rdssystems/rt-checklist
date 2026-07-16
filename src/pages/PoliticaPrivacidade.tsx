import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const PoliticaPrivacidade = () => (
  <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link to="/auth" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline mb-8">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>

      <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Política de Privacidade — RT Expert</h1>
      <p className="text-sm text-muted-foreground mb-10">
        Última atualização: 16 de julho de 2026 · Em conformidade com a Lei nº 13.709/2018 (LGPD)
      </p>

      <div className="space-y-8 text-slate-700 dark:text-slate-300 text-[15px] leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">1. Quais dados coletamos</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong>Dados da sua conta:</strong> nome, e-mail, senha (criptografada), CPF/CNPJ (para faturamento),
              foto de perfil e logotipo da empresa.
            </li>
            <li>
              <strong>Dados que você cadastra sobre seus clientes:</strong> razão social, nome fantasia, CNPJ, nome
              e CPF do responsável legal, telefone, e-mail, endereço e coordenadas geográficas.
            </li>
            <li>
              <strong>Dados das inspeções:</strong> respostas dos checklists, fotos capturadas, pareceres,
              assinaturas digitais (do RT, do cliente e de testemunhas) e datas.
            </li>
            <li>
              <strong>Integração Google Agenda (opcional):</strong> tokens de acesso concedidos por você para criar
              eventos na sua agenda. Não lemos seus eventos existentes.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">2. Para que usamos os dados</h2>
          <p>
            Exclusivamente para prestar o serviço: autenticar seu acesso, armazenar seus checklists e clientes,
            gerar relatórios em PDF, exibir seus clientes no mapa e sincronizar visitas com sua agenda quando
            autorizado. <strong>Não vendemos nem compartilhamos seus dados para fins de marketing.</strong>
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">3. Com quem os dados são compartilhados</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Supabase</strong> (infraestrutura de banco de dados e armazenamento, servidores nos EUA);</li>
            <li><strong>Google</strong> (somente se você conectar a integração com o Google Agenda);</li>
            <li><strong>OpenStreetMap/Nominatim</strong> (endereços são enviados para conversão em coordenadas do mapa).</li>
          </ul>
          <p className="mt-2">
            Esses fornecedores atuam como suboperadores e possuem seus próprios compromissos de segurança e
            privacidade.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">4. Seus direitos (Art. 18 da LGPD)</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Acesso e portabilidade:</strong> exporte todos os seus dados em Configurações → Exportar meus dados.</li>
            <li><strong>Correção:</strong> edite seus dados a qualquer momento nas telas do aplicativo.</li>
            <li><strong>Eliminação:</strong> exclua sua conta e todos os dados em Configurações → Zona de Perigo. A exclusão é imediata e definitiva.</li>
            <li><strong>Revogação de consentimento:</strong> a integração com o Google pode ser desconectada a qualquer momento em Configurações.</li>
            <li>Para os demais direitos previstos na LGPD, contate o encarregado indicado abaixo.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">5. Retenção e exclusão</h2>
          <p>
            Seus dados são mantidos enquanto sua conta estiver ativa. Ao excluir a conta, todos os dados — perfil,
            clientes, modelos, inspeções, fotos, assinaturas e agendamentos — são apagados imediatamente dos nossos
            sistemas ativos. Cópias residuais em backups de infraestrutura são eliminadas em até 30 dias.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">6. Segurança</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Acesso aos dados isolado por conta (Row Level Security);</li>
            <li>Fotos de inspeção armazenadas em área privada, acessíveis apenas por links temporários assinados;</li>
            <li>Comunicação criptografada (HTTPS) em todas as operações;</li>
            <li>Senhas armazenadas com criptografia irreversível (hash).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">7. Incidentes de segurança</h2>
          <p>
            Em caso de incidente de segurança que possa acarretar risco ou dano relevante, comunicaremos a Autoridade
            Nacional de Proteção de Dados (ANPD) e os titulares afetados, nos termos do Art. 48 da LGPD.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">8. Encarregado de dados (DPO)</h2>
          <p>
            Responsável: rDs Systems — contato:{" "}
            <a href="mailto:patrickacampos2015@gmail.com" className="text-primary underline">patrickacampos2015@gmail.com</a>.
            Responderemos às solicitações no menor prazo possível, respeitando os prazos legais.
          </p>
        </section>
      </div>

      <p className="mt-12 text-xs text-muted-foreground">© 2026 RT Expert · rDs Systems</p>
    </div>
  </div>
);

export default PoliticaPrivacidade;
