import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const TermosDeUso = () => (
  <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link to="/auth" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline mb-8">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>

      <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Termos de Uso — RT Expert</h1>
      <p className="text-sm text-muted-foreground mb-10">Última atualização: 16 de julho de 2026</p>

      <div className="space-y-8 text-slate-700 dark:text-slate-300 text-[15px] leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">1. Sobre o serviço</h2>
          <p>
            O RT Expert é um sistema de gestão para Responsáveis Técnicos (RTs), que permite criar modelos de
            checklist, aplicar inspeções em campo, gerenciar clientes, agendar visitas e gerar relatórios em PDF.
            Ao criar uma conta, você concorda integralmente com estes Termos e com a nossa{" "}
            <Link to="/privacidade" className="text-primary underline">Política de Privacidade</Link>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">2. Conta e responsabilidades do usuário</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Você é responsável pela veracidade das informações fornecidas no cadastro.</li>
            <li>Mantenha sua senha em sigilo. Atividades realizadas na sua conta são de sua responsabilidade.</li>
            <li>É proibido usar o sistema para fins ilícitos ou para armazenar conteúdo que viole direitos de terceiros.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">3. Papéis no tratamento de dados (LGPD)</h2>
          <p className="mb-2">
            Para os dados da sua própria conta (nome, e-mail, CPF/CNPJ), o RT Expert atua como{" "}
            <strong>controlador</strong>, nos termos da Lei nº 13.709/2018 (LGPD).
          </p>
          <p>
            Para os dados de terceiros que <strong>você cadastra</strong> no sistema — como dados de seus clientes
            (razão social, CNPJ, nome e CPF do responsável legal, endereço, telefone, fotos de inspeção e
            assinaturas) — <strong>você é o controlador</strong> e o RT Expert atua exclusivamente como{" "}
            <strong>operador</strong>, tratando esses dados apenas conforme suas instruções e para a prestação do
            serviço. Cabe a você garantir que possui base legal (como execução de contrato ou legítimo interesse)
            para inserir esses dados no sistema.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">4. Planos, período de teste e pagamento</h2>
          <p>
            O RT Expert oferece plano gratuito com limites de uso e planos pagos com recursos adicionais. O período
            de teste (trial) concede acesso temporário a recursos premium e expira automaticamente, sem cobrança.
            Valores, limites e condições dos planos são exibidos na página de planos dentro do aplicativo.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">5. Disponibilidade e limitação de responsabilidade</h2>
          <p>
            Empregamos esforços razoáveis para manter o serviço disponível e seguro, mas não garantimos operação
            ininterrupta. O RT Expert é uma ferramenta de apoio: a responsabilidade técnica e legal pelos laudos,
            inspeções e pareceres emitidos permanece integralmente com o Responsável Técnico que os assina.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">6. Encerramento da conta</h2>
          <p>
            Você pode excluir sua conta a qualquer momento em Configurações → Zona de Perigo. A exclusão é
            permanente e remove todos os seus dados, conforme detalhado na Política de Privacidade. Podemos
            suspender contas que violem estes Termos, mediante aviso quando possível.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">7. Alterações e contato</h2>
          <p>
            Estes Termos podem ser atualizados; mudanças relevantes serão comunicadas no aplicativo. Dúvidas podem
            ser enviadas ao nosso contato:{" "}
            <a href="mailto:patrickacampos2015@gmail.com" className="text-primary underline">patrickacampos2015@gmail.com</a>.
          </p>
        </section>
      </div>

      <p className="mt-12 text-xs text-muted-foreground">© 2026 RT Expert · rDs Systems</p>
    </div>
  </div>
);

export default TermosDeUso;
