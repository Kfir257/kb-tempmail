import supabase from './db-client.js';

export const MAX_ALIASES = 50;
export const TAG_RE = /^[a-z0-9](?:[a-z0-9_-]{0,28}[a-z0-9])?$/;

const WORDS_A = ['quiet', 'swift', 'amber', 'misty', 'lunar', 'velvet', 'brisk', 'cobalt', 'silver', 'rustic', 'gentle', 'bold', 'solar', 'mellow', 'crisp', 'hollow', 'nimble', 'vivid', 'ember', 'pine'];
const WORDS_B = ['falcon', 'otter', 'harbor', 'meadow', 'comet', 'river', 'cedar', 'lynx', 'pixel', 'canyon', 'orbit', 'anchor', 'willow', 'breeze', 'summit', 'quartz', 'raven', 'tide', 'glade', 'sparrow'];

export class InputError extends Error {}

export function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export async function requireUser(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    res.status(401).json({ error: 'נדרשת התחברות' });
    return null;
  }
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    res.status(401).json({ error: 'ההתחברות פגה, התחבר מחדש' });
    return null;
  }
  return user;
}

// Accepts only personal Gmail addresses. Returns the normalized address,
// the local part as Google stores it (with dots) and the base letters (no dots).
export function parseGmail(value) {
  const m = String(value ?? '').trim().toLowerCase().match(/^([a-z0-9.]+)@(gmail\.com|googlemail\.com)$/);
  if (!m) return null;
  const local = m[1];
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return null;
  const base = local.replace(/\./g, '');
  if (base.length < 6 || base.length > 30) return null;
  return { email: `${local}@gmail.com`, local, base };
}

export async function getGmailAccount(userId) {
  const { data, error } = await supabase
    .from('gmail_accounts')
    .select('email')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return parseGmail(data.email);
}

export function dottedFrom(base, positions) {
  let out = '';
  for (let i = 0; i < base.length; i++) {
    out += base[i];
    if (i < base.length - 1 && positions.includes(i + 1)) out += '.';
  }
  return out;
}

function randomPositions(len) {
  const count = Math.random() < 0.5 ? 1 : 2;
  const pool = Array.from({ length: len - 1 }, (_, i) => i + 1);
  const picked = [];
  while (picked.length < count) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked.sort((a, b) => a - b);
}

export function randomTag() {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const n = Math.floor(1000 + Math.random() * 9000);
  return `${pick(WORDS_A)}-${pick(WORDS_B)}-${n}`;
}

// Builds an alias that is derived ONLY from the connected Gmail account.
// Plus alias:  <local>+<tag>@gmail.com
// Dot alias:   <letters with dots inserted>[+<tag>]@gmail.com
export function buildAliasSpec(account, input) {
  const mode = input.mode;
  if (!['auto', 'plus', 'dot'].includes(mode)) throw new InputError('סוג כינוי לא חוקי');
  const { local, base } = account;
  const rawTag = typeof input.tag === 'string' ? input.tag.trim().toLowerCase() : '';

  if (mode === 'plus' || (mode === 'auto' && Math.random() < 0.5)) {
    const tag = mode === 'auto' ? randomTag() : rawTag;
    if (!tag) throw new InputError('יש להזין תג (הטקסט שאחרי הפלוס)');
    if (!TAG_RE.test(tag)) throw new InputError('התג יכול להכיל אותיות לטיניות, ספרות, מקף וקו תחתון בלבד (עד 30 תווים)');
    return { kind: 'plus', tag, address: `${local}+${tag}@gmail.com`, key: `${base}+${tag}` };
  }

  let positions = Array.isArray(input.dot_positions) ? input.dot_positions.map(Number) : [];
  let tag = rawTag;
  if (mode === 'auto') {
    positions = randomPositions(base.length);
    tag = randomTag();
  }
  positions = [...new Set(positions)];
  if (positions.some((p) => !Number.isInteger(p) || p < 1 || p > base.length - 1)) {
    throw new InputError('מיקום נקודה לא חוקי');
  }
  if (!positions.length && !tag) throw new InputError('בחר לפחות נקודה אחת או הוסף תג');
  if (tag && !TAG_RE.test(tag)) throw new InputError('התג יכול להכיל אותיות לטיניות, ספרות, מקף וקו תחתון בלבד (עד 30 תווים)');

  const dottedLocal = positions.length ? dottedFrom(base, positions) : local;
  if (!tag && dottedLocal === local) {
    throw new InputError('זו כתובת החשבון הראשית ולא כינוי. בחר מיקום נקודה אחר או הוסף תג');
  }
  return {
    kind: 'dot',
    tag: tag || null,
    address: `${dottedLocal}${tag ? '+' + tag : ''}@gmail.com`,
    key: tag ? `${base}+${tag}` : base,
  };
}
