import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validação de Token de Segurança (vinda do painel do Asaas)
  const asaasToken = req.headers['asaas-access-token']; 
  const EXPECTED_TOKEN = 'whsec_L25w30k4u1cNQ0AX1m53tVPb5-W5xyJVpO8ETwMtD44';

  if (asaasToken !== EXPECTED_TOKEN) {
    console.error('Webhook Asaas: Token de autenticação inválido');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const { event, payment, subscription } = req.body;
  const userId = payment?.externalReference || subscription?.externalReference;

  if (!userId) {
    console.log('Webhook Asaas: Evento recebido sem userId (externalReference)');
    return res.status(200).json({ status: 'ignored' });
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // Precisamos da role de serviço para ignorar RLS
  );

  try {
    console.log(`Recebido evento Asaas: ${event} para o usuário ${userId}`);

    // Lista de eventos que confirmam pagamento ou renovação
    const confirmedEvents = [
      'PAYMENT_CONFIRMED',
      'PAYMENT_RECEIVED',
      'SUBSCRIPTION_CREATED',
      'SUBSCRIPTION_RENEWED'
    ];

    if (confirmedEvents.includes(event)) {
      // 1. Identificar se é Assinatura Recorrente ou Pagamento Único
      const isSubscription = !!payment?.subscription || event.startsWith('SUBSCRIPTION');
      
      if (isSubscription) {
        // Se for assinatura, plano 'premium' (Expert) por tempo indeterminado enquanto pagar
        const { error } = await supabase
          .from('profiles')
          .update({ 
            plan_type: 'premium',
            subscription_id: payment?.subscription || subscription?.id
          })
          .eq('id', userId);
        
        if (error) throw error;
      } else {
        // Se for pagamento avulso (PIX/Boleto), adicionamos 30 dias na validade
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        const { error } = await supabase
          .from('profiles')
          .update({ 
            plan_type: 'premium',
            trial_ends_at: expiresAt.toISOString()
          })
          .eq('id', userId);

        if (error) throw error;
      }

      console.log(`Plano Expert ativado/renovado para o usuário: ${userId}`);
    }

    // Eventos de cancelamento ou falha
    const cancelEvents = [
      'SUBSCRIPTION_DELETED',
      'PAYMENT_OVERDUE',
      'PAYMENT_DELETED'
    ];

    if (cancelEvents.includes(event)) {
      await supabase
        .from('profiles')
        .update({ 
          plan_type: 'free'
        })
        .eq('id', userId);
      
      console.log(`Plano do usuário ${userId} revertido para FREE devido a status no Asaas`);
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Erro no Webhook Asaas:', error);
    return res.status(500).json({ error: error.message });
  }
}
