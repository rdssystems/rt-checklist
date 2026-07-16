export interface Cliente {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  cep: string | null;
  rua: string | null;
  numero?: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  telefone: string | null;
  email_cliente: string | null;
  responsavel_legal: string | null;
  cpf_responsavel: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface CampoChecklist {
  id: string;
  tipo: "titulo" | "descricao" | "sim_nao_na" | "observacao" | "foto" | "multipla_escolha" | "data" | "texto" | "outros";
  label: string;
  opcoes?: string[];
  obrigatorio?: boolean;
  tem_observacao?: boolean;
}

export interface Secao {
  id: string;
  titulo: string;
  descricao?: string;
  campos: CampoChecklist[];
}

export interface Modelo {
  id: string;
  nome_modelo: string;
  estrutura_json: {
    campos?: CampoChecklist[];
    secoes?: Secao[];
  };
}

export interface ChecklistPronto {
  id: string;
  data_aplicacao: string;
  modelo_id: string;
  cliente_id: string;
  respostas_json: Record<string, unknown>;
  parecer_conclusivo: string | null;
  data_proxima_inspecao: string | null;
  responsavel_inspecao: string | null;
  assinatura_rt: string | null;
  assinatura_cliente: string | null;
  assinatura_testemunha?: string | null;
  nome_cliente_assinatura: string | null;
  nome_testemunha_assinatura: string | null;
  modelos_checklist: {
    nome_modelo: string;
    estrutura_json: {
      campos?: CampoChecklist[];
      secoes?: Secao[];
    };
  };
  clientes: {
    razao_social: string;
    cnpj: string;
    rua: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
    responsavel_legal: string;
  };
}

export interface Agendamento {
  id: string;
  data_visita: string;
  status: "pendente" | "concluido" | "cancelado";
  descricao: string;
  cliente: {
    id: string;
    razao_social: string;
    nome_fantasia: string | null;
  };
}

export interface PlanStatus {
  isPremium: boolean;
  planType: string;
  daysLeft: number;
}
