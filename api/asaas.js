
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, userId, email, name, cpfCnpj } = req.body;
  const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
  const isProd = process.env.NODE_ENV === 'production';
  const ASAAS_URL = isProd ? 'https://www.asaas.com/api/v3' : 'https://sandbox.asaas.com/api/v3';

  if (!ASAAS_API_KEY) {
    return res.status(500).json({ error: 'ASAAS_API_KEY non configurada no servidor' });
  }

  try {
    // 1. Verificar se o cliente já existe no Asaas por email
    let customerId;
    const customerSearchResponse = await fetch(`${ASAAS_URL}/customers?email=${email}`, {
      headers: { 'access_token': ASAAS_API_KEY }
    });
    const customers = await customerSearchResponse.json();

    if (customers.data && customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      // Criar novo cliente
      const createCustomerResponse = await fetch(`${ASAAS_URL}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': ASAAS_API_KEY
        },
        body: JSON.stringify({ 
          name, 
          email,
          cpfCnpj,
          externalReference: userId
        })
      });
      const newCustomer = await createCustomerResponse.json();
      if (newCustomer.errors) throw new Error(newCustomer.errors[0].description);
      customerId = newCustomer.id;
    }

    // 2. Criar a cobrança ou assinatura
    let paymentData;
    
    if (type === 'RECURRING') {
      // Criar Assinatura (Recorrente) - R$ 80,00
      const subscriptionResponse = await fetch(`${ASAAS_URL}/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': ASAAS_API_KEY
        },
        body: JSON.stringify({
          customer: customerId,
          billingType: 'CREDIT_CARD',
          value: 80,
          nextDueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Amanhã
          cycle: 'MONTHLY',
          description: 'Plano RT Expert - Assinatura Mensal Recorrente',
          externalReference: userId
        })
      });
      paymentData = await subscriptionResponse.json();
    } else {
      // Criar Cobrança Única (Avulsa) - R$ 99,90
      const paymentResponse = await fetch(`${ASAAS_URL}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': ASAAS_API_KEY
        },
        body: JSON.stringify({
          customer: customerId,
          billingType: 'UNDEFINED', // Deixa o usuário escolher no checkout (PIX, Boleto, Cartão)
          value: 99.9,
          dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0], // 3 dias pra pagar
          description: 'Plano RT Expert - Acesso 30 Dias (Avulso)',
          externalReference: userId
        })
      });
      paymentData = await paymentResponse.json();
    }

    if (paymentData.errors) {
      throw new Error(paymentData.errors[0].description);
    }

    // Retornar a URL de checkout
    // Para assinaturas o campo é invoiceUrl ou similar dependendo da versão, 
    // mas comumente usamos o link interno de pagamento da primeira parcela ou o link geral.
    // No V3 do Asaas para assinaturas ele gera uma fatura inicial.
    
    res.status(200).json({ 
      url: paymentData.invoiceUrl || paymentData.bankSlipUrl || paymentData.checkoutUrl || paymentData.invoiceCustomizationUrl
    });

  } catch (error) {
    console.error('Erro Asaas:', error);
    res.status(500).json({ error: error.message });
  }
}
