
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
    const today = new Date().toISOString().split('T')[0];
    
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
          billingType: 'UNDEFINED', // Deixa entrar no checkout e escolher/cadastrar cartão
          value: 80,
          nextDueDate: today, // Primeiro pagamento hoje
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
          billingType: 'UNDEFINED',
          value: 99.9,
          dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
          description: 'Plano RT Expert - Acesso 30 Dias (Avulso)',
          externalReference: userId
        })
      });
      paymentData = await paymentResponse.json();
    }

    if (paymentData.errors) {
      throw new Error(paymentData.errors[0].description);
    }

    // Para assinaturas o link pode estar em 'invoiceUrl' ou 'invoiceCustomizationUrl'
    const checkoutUrl = paymentData.invoiceUrl || 
                        paymentData.bankSlipUrl || 
                        paymentData.checkoutUrl || 
                        paymentData.invoiceCustomizationUrl;
    
    if (!checkoutUrl && type === 'RECURRING') {
      // Caso o Asaas não retorne o link direto na assinatura, tentamos buscar a primeira cobrança dela
      const paymentsResponse = await fetch(`${ASAAS_URL}/payments?subscription=${paymentData.id}`, {
        headers: { 'access_token': ASAAS_API_KEY }
      });
      const payments = await paymentsResponse.json();
      if (payments.data && payments.data.length > 0) {
        return res.status(200).json({ url: payments.data[0].invoiceUrl });
      }
    }

    if (!checkoutUrl) {
      console.error('Objeto recebido do Asaas:', JSON.stringify(paymentData));
      throw new Error("Não foi possível gerar a URL de pagamento. Tente novamente.");
    }

    res.status(200).json({ url: checkoutUrl });

  } catch (error) {
    console.error('Erro Asaas:', error);
    res.status(500).json({ error: error.message });
  }
}
