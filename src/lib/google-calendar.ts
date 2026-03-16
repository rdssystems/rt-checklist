import { supabase } from "@/integrations/supabase/client";

export async function syncToGoogleCalendar(visita: any) {
  try {
    // 1. Buscar o token do usuário
    const { data, error: profileError } = await (supabase as any)
      .from('profiles')
      .select('google_access_token, google_token_expiry')
      .eq('id', visita.tenant_id)
      .single();

    const profile = data as any;

    if (profileError || !profile?.google_access_token) {
      console.log("Usuário não tem Google Agenda conectado.");
      return null;
    }

    // 2. Verificar expiração (simples, em produção usaríamos refresh token)
    const expiry = new Date(profile.google_token_expiry);
    if (expiry < new Date()) {
      console.error("Token do Google expirado. O usuário precisa reconectar.");
      return null;
    }

    // 3. Preparar o evento
    const event = {
      summary: `Inspeção Técnica: ${visita.cliente_nome}`,
      description: visita.descricao || 'Visita agendada via RT-Checklist',
      start: {
        dateTime: visita.data_visita, // ISO String
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: new Date(new Date(visita.data_visita).getTime() + 3600000).toISOString(), // +1 hora
        timeZone: 'America/Sao_Paulo',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 60 },
        ],
      },
    };

    // 4. Chamar API do Google
    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${profile.google_access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Erro na Google Calendar API:", errorData);
      throw new Error(errorData.error?.message || "Erro ao criar evento no Google");
    }

    const createdEvent = await response.json();
    return createdEvent.id;

  } catch (error) {
    console.error("Erro na sincronização com Google:", error);
    return null;
  }
}
