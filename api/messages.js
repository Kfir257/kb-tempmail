import supabase from './db-client.js';
import { setCors, requireUser } from './_shared.js';

const LIST_COLS = 'id, alias_id, gmail_id, to_address, from_name, from_address, subject, snippet, received_at, is_read';
const FULL_COLS = `${LIST_COLS}, body`;

const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : null);
const isoDate = (v) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const user = await requireUser(req, res);
    if (!user) return;

    if (req.method === 'GET') {
      if (req.query.ids !== undefined) {
        const { data, error } = await supabase
          .from('messages')
          .select('gmail_id, alias_id')
          .eq('user_id', user.id)
          .limit(5000);
        if (error) throw error;
        return res.status(200).json(data);
      }
      if (req.query.id !== undefined) {
        const { data, error } = await supabase
          .from('messages')
          .select(FULL_COLS)
          .eq('user_id', user.id)
          .eq('id', Number(req.query.id))
          .maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'ההודעה לא נמצאה' });
        return res.status(200).json(data);
      }
      const { data, error } = await supabase
        .from('messages')
        .select(LIST_COLS)
        .eq('user_id', user.id)
        .order('received_at', { ascending: false })
        .limit(300);
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const rows = Array.isArray(req.body?.messages) ? req.body.messages.slice(0, 100) : [];
      if (!rows.length) return res.status(200).json({ inserted: 0 });

      const aliasIds = [...new Set(rows.map((r) => Number(r.alias_id)))];
      const { data: owned, error: ownErr } = await supabase
        .from('aliases')
        .select('id')
        .eq('user_id', user.id)
        .in('id', aliasIds);
      if (ownErr) throw ownErr;
      const ownedSet = new Set(owned.map((a) => a.id));

      const gmailIds = [...new Set(rows.map((r) => String(r.gmail_id || '').slice(0, 64)).filter(Boolean))];
      const { data: existing, error: exErr } = await supabase
        .from('messages')
        .select('gmail_id, alias_id')
        .eq('user_id', user.id)
        .in('gmail_id', gmailIds);
      if (exErr) throw exErr;
      const seen = new Set(existing.map((e) => `${e.gmail_id}:${e.alias_id}`));

      const toInsert = [];
      for (const r of rows) {
        const alias_id = Number(r.alias_id);
        const gmail_id = String(r.gmail_id || '').slice(0, 64);
        if (!gmail_id || !ownedSet.has(alias_id)) continue;
        const key = `${gmail_id}:${alias_id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        toInsert.push({
          user_id: user.id,
          alias_id,
          gmail_id,
          to_address: str(r.to_address, 320),
          from_name: str(r.from_name, 200),
          from_address: str(r.from_address, 320),
          subject: str(r.subject, 500),
          snippet: str(r.snippet, 400),
          body: str(r.body, 20000),
          received_at: isoDate(r.received_at),
          is_read: false,
        });
      }
      if (toInsert.length) {
        const { error } = await supabase.from('messages').insert(toInsert);
        if (error) throw error;
      }
      return res.status(201).json({ inserted: toInsert.length });
    }

    if (req.method === 'PUT') {
      const ids = (Array.isArray(req.body?.ids) ? req.body.ids : []).map(Number).filter(Number.isInteger);
      if (!ids.length) return res.status(400).json({ error: 'לא נבחרו הודעות' });
      const { error } = await supabase
        .from('messages')
        .update({ is_read: !!req.body.is_read })
        .eq('user_id', user.id)
        .in('id', ids);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const id = Number(req.body?.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: 'מזהה לא חוקי' });
      const { error } = await supabase.from('messages').delete().eq('user_id', user.id).eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: err.message || 'שגיאת שרת' });
  }
}
