import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validação de Token de Segurança (vinda do painel do Asaas)
  const asaasToken = req.headers['asaas-access-token'];
  const EXPECTED_TOKEN = process.env.ASAAS_WEBHOOK_TOKEN || 'whsec_L25w30k4u1cNQ0AX1m53tVPb5-W5xyJVpO8ETwMtD44';

  if (asaasToken !== EXPECTED_TOKEN) {
    console.error('Webhook Asaas: Token de autenticação inválido');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const { event, payment, subscription } = req.body;
  const rawRef = payment?.externalReference || subscription?.externalReference;

  if (!rawRef) {
    console.log('Webhook Asaas: Evento recebido sem externalReference');
    return res.status(200).json({ status: 'ignored' });
  }

  // Desestruturar userId e planTier (ex: "uuid:drive" ou "uuid:cloud")
  const [userId, tierExt] = rawRef.includes(':') ? rawRef.split(':') : [rawRef, 'cloud'];
  const planTier = ['drive', 'cloud', 'enterprise'].includes(tierExt) ? tierExt : 'cloud';
  const storageProvider = planTier === 'drive' ? 'google_drive' : 'supabase';

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    console.log(`Recebido evento Asaas: ${event} para o usuário ${userId} (Plano: ${planTier})`);

    const confirmedEvents = [
      'PAYMENT_CONFIRMED',
      'PAYMENT_RECEIVED',
      'SUBSCRIPTION_CREATED',
      'SUBSCRIPTION_RENEWED'
    ];

    if (confirmedEvents.includes(event)) {
      const isSubscription = !!payment?.subscription || event.startsWith('SUBSCRIPTION');
      
      if (isSubscription) {
        const { error } = await supabase
          .from('profiles')
          .update({
            plan_type: 'premium',
            plan_tier: planTier,
            storage_provider: storageProvider,
            plan_expires_at: null,
            subscription_id: payment?.subscription || subscription?.id
          })
          .eq('id', userId);

        if (error) throw error;
      } else {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        const { error } = await supabase
          .from('profiles')
          .update({
            plan_type: 'premium',
            plan_tier: planTier,
            storage_provider: storageProvider,
            plan_expires_at: expiresAt.toISOString()
          })
          .eq('id', userId);

        if (error) throw error;
      }

      console.log(`Plano ${planTier.toUpperCase()} ativado/renovado para o usuário: ${userId}`);
    }

    const cancelEvents = [
      'SUBSCRIPTION_DELETED',
      'PAYMENT_OVERDUE',
      'PAYMENT_DELETED'
    ];

    if (cancelEvents.includes(event)) {
      await supabase
        .from('profiles')
        .update({
          plan_type: 'free',
          plan_tier: 'free',
          storage_provider: 'supabase',
          plan_expires_at: null
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
