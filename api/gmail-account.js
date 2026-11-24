import supabase from './db-client.js';
import { setCors, requireUser, parseGmail } from './_shared.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const user = await requireUser(req, res);
    if (!user) return;

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('gmail_accounts')
        .select('email, connected_at, last_sync_at')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        return res.status(200).json({ connected: false, email: null, local: null, base: null, connected_at: null, last_sync_at: null });
      }
      const parsed = parseGmail(data.email);
      return res.status(200).json({
        connected: true,
        email: data.email,
        local: parsed?.local ?? null,
        base: parsed?.base ?? null,
        connected_at: data.connected_at,
        last_sync_at: data.last_sync_at,
      });
    }

    if (req.method === 'POST') {
      const parsed = parseGmail(req.body?.email);
      if (!parsed) return res.status(400).json({ error: 'רק חשבונות Gmail אישיים (@gmail.com) נתמכים' });

      const { data: existing, error: exErr } = await supabase
        .from('gmail_accounts')
        .select('email')
        .eq('user_id', user.id)
        .maybeSingle();
      if (exErr) throw exErr;
      if (existing) {
        if (existing.email !== parsed.email) {
          return res.status(409).json({ error: `כבר מחובר החשבון ${existing.email}. נתק אותו לפני חיבור חשבון אחר.` });
        }
        return res.status(200).json({ ok: true });
      }

      const { error } = await supabase.from('gmail_accounts').insert({
        user_id: user.id,
        email: parsed.email,
        connected_at: new Date().toISOString(),
      });
      if (error) throw error;
      return res.status(201).json({ ok: true });
    }

    if (req.method === 'PUT') {
      const { error } = await supabase
        .from('gmail_accounts')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('user_id', user.id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const { error: mErr } = await supabase.from('messages').delete().eq('user_id', user.id);
      if (mErr) throw mErr;
      const { error: aErr } = await supabase.from('aliases').delete().eq('user_id', user.id);
      if (aErr) throw aErr;
      const { error } = await supabase.from('gmail_accounts').delete().eq('user_id', user.id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: err.message || 'שגיאת שרת' });
  }
}
