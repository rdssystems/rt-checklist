import { createClient } from '@supabase/supabase-js';

/**
 * Renova o access_token do Google usando o refresh_token salvo no perfil.
 * Precisa rodar no servidor porque exige o GOOGLE_CLIENT_SECRET.
 * Autenticação: JWT do Supabase no header Authorization — o token renovado
 * é sempre o do próprio usuário autenticado.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    const jwt = authHeader?.replace('Bearer ', '');
    if (!jwt) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);
    if (userError || !user) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('google_refresh_token')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.google_refresh_token) {
      return res.status(400).json({ error: 'reconnect_required' });
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.VITE_GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: profile.google_refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    const tokens = await response.json();

    if (tokens.error) {
      console.error('Google refresh error:', tokens);
      // invalid_grant = refresh token revogado/expirado: usuário precisa reconectar
      if (tokens.error === 'invalid_grant') {
        await supabaseAdmin
          .from('profiles')
          .update({ google_access_token: null, google_refresh_token: null, google_token_expiry: null })
          .eq('id', user.id);
        return res.status(400).json({ error: 'reconnect_required' });
      }
      throw new Error(tokens.error_description || tokens.error);
    }

    const update = {
      google_access_token: tokens.access_token,
      google_token_expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    };
    // O Google pode rotacionar o refresh_token; salva o novo quando vier
    if (tokens.refresh_token) {
      update.google_refresh_token = tokens.refresh_token;
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(update)
      .eq('id', user.id);

    if (updateError) throw updateError;

    return res.status(200).json({ access_token: tokens.access_token });
  } catch (error) {
    console.error('API google-refresh error:', error);
    return res.status(500).json({ error: error.message });
  }
}
