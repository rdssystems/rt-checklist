export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, planTier = 'cloud', userId, email, name, cpfCnpj } = req.body;
  const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
  const isProd = process.env.NODE_ENV === 'production';
  const ASAAS_URL = isProd ? 'https://www.asaas.com/api/v3' : 'https://sandbox.asaas.com/api/v3';

  if (!ASAAS_API_KEY) {
    return res.status(500).json({ error: 'ASAAS_API_KEY não configurada no servidor' });
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
          externalReference: `${userId}:${planTier}`
        })
      });
      const newCustomer = await createCustomerResponse.json();
      if (newCustomer.errors) throw new Error(newCustomer.errors[0].description);
      customerId = newCustomer.id;
    }

    // 2. Definir valor e descrição de acordo com o plano
    let value = 89.9;
    let description = "Plano RT Expert CLOUD - Assinatura Mensal";

    if (planTier === 'drive') {
      value = 59.9;
      description = "Plano RT Expert DRIVE (BYOS Google Drive) - Assinatura Mensal";
    } else if (planTier === 'enterprise') {
      value = 149.9;
      description = "Plano RT Expert ENTERPRISE - Assinatura Mensal";
    } else if (type === 'SINGLE') {
      value = 99.9;
      description = "Plano RT Expert - Acesso Avulso 30 Dias";
    }

    const externalRef = `${userId}:${planTier}`;
    let paymentData;
    const today = new Date().toISOString().split('T')[0];

    if (type === 'SINGLE') {
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
          value,
          dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
          description,
          externalReference: externalRef
        })
      });
      paymentData = await paymentResponse.json();
    } else {
      // Criar Assinatura Recorrente Mensal
      const subscriptionResponse = await fetch(`${ASAAS_URL}/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': ASAAS_API_KEY
        },
        body: JSON.stringify({
          customer: customerId,
          billingType: 'UNDEFINED',
          value,
          nextDueDate: today,
          cycle: 'MONTHLY',
          description,
          externalReference: externalRef
        })
      });
      paymentData = await subscriptionResponse.json();
    }

    if (paymentData.errors) {
      throw new Error(paymentData.errors[0].description);
    }

    const checkoutUrl = paymentData.invoiceUrl || 
                        paymentData.bankSlipUrl || 
                        paymentData.checkoutUrl || 
                        paymentData.invoiceCustomizationUrl;

    if (!checkoutUrl && type !== 'SINGLE') {
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
