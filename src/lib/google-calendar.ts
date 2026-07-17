import { supabase } from "@/integrations/supabase/client";

/** Renova o access_token do Google via endpoint server-side (usa o refresh_token salvo). */
async function refreshGoogleToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const response = await fetch('/api/google-refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    const data = await response.json();
    if (!response.ok || !data.access_token) {
      console.error("Falha ao renovar token do Google:", data);
      return null;
    }
    return data.access_token;
  } catch (error) {
    console.error("Erro ao renovar token do Google:", error);
    return null;
  }
}

async function criarEvento(accessToken: string, event: object): Promise<Response> {
  return fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });
}

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

    // 2. Renova automaticamente se expirado (ou a menos de 2 min de expirar)
    let accessToken: string | null = profile.google_access_token;
    const expiry = profile.google_token_expiry ? new Date(profile.google_token_expiry) : null;
    if (!expiry || expiry.getTime() < Date.now() + 2 * 60 * 1000) {
      accessToken = await refreshGoogleToken();
      if (!accessToken) {
        console.error("Não foi possível renovar o token do Google. Reconexão necessária.");
        return "reconnect_required";
      }
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

    // 4. Chamar API do Google (com uma nova tentativa após refresh em caso de 401)
    let response = await criarEvento(accessToken, event);

    if (response.status === 401) {
      const renewed = await refreshGoogleToken();
      if (!renewed) return "reconnect_required";
      response = await criarEvento(renewed, event);
    }

    if (!response.ok) {
      const errorData = await response.json();
      console.error("ERRO DETALHADO GOOGLE API:", errorData);

      if (errorData.error?.code === 401) {
        return "reconnect_required";
      }

      throw new Error(errorData.error?.message || "Erro ao criar evento no Google");
    }

    const createdEvent = await response.json();
    console.log("Evento criado com sucesso no Google ID:", createdEvent.id);
    return createdEvent.id;

  } catch (error) {
    console.error("Erro na sincronização com Google:", error);
    return null;
  }
}
