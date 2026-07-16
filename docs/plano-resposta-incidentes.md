# Plano de Resposta a Incidentes de Segurança — RT Expert

**Base legal:** Art. 48 da LGPD (Lei nº 13.709/2018)
**Responsável (Encarregado/DPO):** rDs Systems — patrickacampos2015@gmail.com
**Última revisão:** 16/07/2026

## 1. O que é um incidente

Qualquer evento que possa comprometer a confidencialidade, integridade ou disponibilidade de dados
pessoais tratados pelo RT Expert. Exemplos:

- Vazamento ou acesso não autorizado ao banco de dados (Supabase);
- Exposição indevida de fotos de inspeção, assinaturas ou dados de clientes;
- Comprometimento de credenciais de usuários ou de chaves de API (service role, tokens Google);
- Exclusão ou alteração indevida de dados em massa.

## 2. Fluxo de resposta

| Etapa | Prazo alvo | Ação |
|---|---|---|
| 1. Detecção e registro | Imediato | Registrar data/hora, como foi detectado e o que foi observado |
| 2. Contenção | Até 24h | Revogar chaves expostas (dashboard Supabase → Settings → API), desativar funções comprometidas, bloquear contas suspeitas |
| 3. Avaliação | Até 48h | Identificar: quais dados, quantos titulares, sensibilidade, risco de dano |
| 4. Comunicação à ANPD | Prazo razoável (recomendação: até 3 dias úteis) | Se houver risco ou dano relevante aos titulares, comunicar via [portal da ANPD](https://www.gov.br/anpd) |
| 5. Comunicação aos titulares | Junto à etapa 4 | Informar por e-mail os usuários afetados: o que vazou, riscos e medidas tomadas |
| 6. Erradicação e lições | Até 15 dias | Corrigir a causa raiz, documentar e ajustar este plano |

## 3. Conteúdo mínimo da comunicação (ANPD e titulares)

1. Descrição da natureza dos dados afetados;
2. Informações sobre os titulares envolvidos;
3. Medidas técnicas de segurança utilizadas (RLS, bucket privado, HTTPS, hash de senhas);
4. Riscos relacionados ao incidente;
5. Medidas adotadas para reverter ou mitigar os efeitos.

## 4. Contatos e acessos críticos

- **Infraestrutura:** Supabase — projeto `ismemgtitjpvedgxmayo` (dashboard → suporte)
- **Hospedagem do frontend:** verificar painel da hospedagem (deploy via GitHub `rdssystems/rt-checklist`)
- **Revogação de chaves:** Supabase Dashboard → Project Settings → API → "Reset" nas chaves
- **Revogação Google OAuth:** Google Cloud Console → Credenciais do projeto

## 5. Prevenção contínua

- Fotos de inspeção em bucket privado com URLs assinadas temporárias;
- Row Level Security em todas as tabelas, isolando dados por `tenant_id`;
- Exclusão definitiva de dados ao encerrar conta (função `delete-account`);
- Limpeza periódica de arquivos órfãos (função `cleanup-orphan-photos`);
- Revisão deste plano a cada 6 meses ou após qualquer incidente.
