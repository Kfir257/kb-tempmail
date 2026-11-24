import supabase from './db-client.js';
import { setCors, requireUser, getGmailAccount, buildAliasSpec, InputError, MAX_ALIASES } from './_shared.js';

const TTL_ALLOWED = [1, 24, 168];
const COLS = 'id, gmail_address, alias_address, match_key, kind, label, created_at, expires_at';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const user = await requireUser(req, res);
    if (!user) return;

    if (req.method === 'GET') {
      const [aliasesRes, msgsRes] = await Promise.all([
        supabase.from('aliases').select(COLS).eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('messages').select('alias_id, is_read').eq('user_id', user.id).limit(5000),
      ]);
      if (aliasesRes.error) throw aliasesRes.error;
      if (msgsRes.error) throw msgsRes.error;
      const stats = new Map();
      for (const m of msgsRes.data) {
        const s = stats.get(m.alias_id) ?? { unread: 0, total: 0 };
        s.total += 1;
        if (!m.is_read) s.unread += 1;
        stats.set(m.alias_id, s);
      }
      const result = aliasesRes.data.map((a) => ({ ...a, unread: stats.get(a.id)?.unread ?? 0, total: stats.get(a.id)?.total ?? 0 }));
      return res.status(200).json(result);
    }

    if (req.method === 'POST') {
      const account = await getGmailAccount(user.id);
      if (!account) return res.status(400).json({ error: 'יש לחבר חשבון Gmail לפני יצירת כינויים' });

      const { count, error: countErr } = await supabase
        .from('aliases')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      if (countErr) throw countErr;
      if ((count ?? 0) >= MAX_ALIASES) {
        return res.status(400).json({ error: `הגעת למכסה של ${MAX_ALIASES} כינויים. מחק כינויים ישנים כדי ליצור חדשים.` });
      }

      const body = req.body || {};
      const ttl = body.ttl_hours === null || body.ttl_hours === undefined ? null : Number(body.ttl_hours);
      if (ttl !== null && !TTL_ALLOWED.includes(ttl)) return res.status(400).json({ error: 'משך תוקף לא חוקי' });
      const label = typeof body.label === 'string' ? body.label.trim().slice(0, 60) : '';

      const attempts = body.mode === 'auto' ? 8 : 1;
      let spec = null;
      for (let i = 0; i < attempts; i++) {
        let candidate;
        try {
          candidate = buildAliasSpec(account, body);
        } catch (e) {
          if (e instanceof InputError) return res.status(400).json({ error: e.message });
          throw e;
        }
        const { data: existing, error: exErr } = await supabase
          .from('aliases')
          .select('alias_address')
          .eq('user_id', user.id)
          .eq('match_key', candidate.key)
          .maybeSingle();
        if (exErr) throw exErr;
        if (!existing) {
          spec = candidate;
          break;
        }
        if (attempts === 1) {
          return res.status(409).json({ error: `כבר קיים כינוי שמנותב לאותה תיבה: ${existing.alias_address}` });
        }
      }
      if (!spec) return res.status(409).json({ error: 'לא הצלחנו למצוא כינוי פנוי, נסה שוב' });

      const { data, error } = await supabase
        .from('aliases')
        .insert({
          user_id: user.id,
          gmail_address: account.email,
          alias_address: spec.address,
          match_key: spec.key,
          kind: spec.kind,
          label: label || null,
          expires_at: ttl ? new Date(Date.now() + ttl * 3600 * 1000).toISOString() : null,
        })
        .select(COLS)
        .single();
      if (error) throw error;
      return res.status(201).json({ ...data, unread: 0, total: 0 });
    }

    if (req.method === 'DELETE') {
      const id = Number(req.body?.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: 'מזהה לא חוקי' });
      const { error } = await supabase.from('messages').delete().eq('user_id', user.id).eq('alias_id', id);
      if (error) throw error;
      const { error: delErr } = await supabase.from('aliases').delete().eq('user_id', user.id).eq('id', id);
      if (delErr) throw delErr;
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: err.message || 'שגיאת שרת' });
  }
}
