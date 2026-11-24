const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export const GMAIL_SCOPE = 'openid email https://www.googleapis.com/auth/gmail.readonly';
const SESSION_KEY = 'masveh.gmail.session';
const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';
const SEARCH_QUERY = 'newer_than:14d -in:spam -in:trash';
const MAX_CANDIDATES = 60;
const CONCURRENCY = 6;
const BODY_LIMIT = 20000;

export interface GmailSession {
  accessToken: string;
  expiresAt: number;
  email: string;
}

export class GmailAuthError extends Error {}

// ---------- session (per browser tab, never sent to our server) ----------

export function getGmailSession(): GmailSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as GmailSession;
    if (!s.accessToken || !s.expiresAt || s.expiresAt <= Date.now()) {
      clearGmailSession();
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function saveGmailSession(s: GmailSession) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

export function clearGmailSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

// ---------- Google Identity Services (token model, read-only Gmail scope) ----------

interface GisTokenResponse {
  access_token?: string;
  expires_in?: number | string;
  error?: string;
}

interface GisOauth2 {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    callback: (r: GisTokenResponse) => void;
    error_callback: (e: { type?: string }) => void;
  }) => { requestAccessToken: (o: { prompt: string }) => void };
  revoke: (token: string, done: () => void) => void;
}

function gisOauth2(): GisOauth2 | undefined {
  return (window as unknown as { google?: { accounts?: { oauth2?: GisOauth2 } } }).google?.accounts?.oauth2;
}

let gisLoading: Promise<void> | null = null;

function loadGis(): Promise<void> {
  if (gisOauth2()) return Promise.resolve();
  if (!gisLoading) {
    gisLoading = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        gisLoading = null;
        reject(new Error('לא ניתן לטעון את שירותי Google. בדוק חוסמי פרסום או חיבור לאינטרנט.'));
      };
      document.head.appendChild(script);
    });
  }
  return gisLoading;
}

const GIS_ERRORS: Record<string, string> = {
  access_denied: 'לא אישרת את הגישה לקריאת Gmail. בלי אישור זה אי אפשר לסנכרן הודעות.',
  popup_closed: 'חלון Google נסגר לפני שהחיבור הושלם.',
  popup_failed_to_open: 'הדפדפן חסם את חלון Google. אפשר חלונות קופצים לאתר ונסה שוב.',
};

function gisError(code?: string): Error {
  return new Error(GIS_ERRORS[code ?? ''] ?? 'החיבור ל-Google נכשל. נסה שוב.');
}

export async function requestGmailToken(prompt: 'select_account' | ''): Promise<{ accessToken: string; expiresIn: number }> {
  if (!CLIENT_ID) {
    throw new Error('חסר מזהה לקוח של Google (VITE_GOOGLE_CLIENT_ID). ראה הוראות ההגדרה במדריך.');
  }
  await loadGis();
  const oauth2 = gisOauth2();
  if (!oauth2) throw new Error('שירותי Google אינם זמינים כרגע');
  return new Promise((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: GMAIL_SCOPE,
      callback: (r) => {
        if (r.error || !r.access_token) {
          reject(gisError(r.error));
          return;
        }
        resolve({ accessToken: r.access_token, expiresIn: Number(r.expires_in ?? 3600) });
      },
      error_callback: (e) => reject(gisError(e?.type)),
    });
    client.requestAccessToken({ prompt });
  });
}

export function revokeGmailToken(token: string) {
  loadGis()
    .then(() => gisOauth2()?.revoke(token, () => undefined))
    .catch(() => undefined);
}

export async function fetchGoogleEmail(token: string): Promise<string> {
  const res = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('לא ניתן לקרוא את פרטי החשבון מ-Google');
  const json = (await res.json()) as { email?: string; email_verified?: boolean };
  if (!json.email || !json.email_verified) throw new Error('כתובת החשבון של Google לא אומתה');
  return json.email.toLowerCase();
}

// ---------- Gmail REST API ----------

interface GmailHeader { name: string; value: string }
interface GmailPart { mimeType?: string; body?: { data?: string }; parts?: GmailPart[]; headers?: GmailHeader[] }
interface GmailMessage { id: string; snippet?: string; internalDate?: string; payload?: GmailPart }

async function gapi<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${GMAIL_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) throw new GmailAuthError('החיבור ל-Gmail פג');
  if (!res.ok) {
    const j = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    if (res.status === 403) {
      throw new Error(`Gmail API: ${j?.error?.message ?? 'אין הרשאה'}. ודא שהפעלת את Gmail API בפרויקט Google Cloud (ראה המדריך).`);
    }
    throw new Error(j?.error?.message ?? `שגיאת Gmail (${res.status})`);
  }
  return (await res.json()) as T;
}

function header(payload: GmailPart | undefined, name: string): string {
  const h = payload?.headers?.find((x) => x.name.toLowerCase() === name.toLowerCase());
  return h?.value ?? '';
}

// Pulls every email address out of a header value. Gmail addresses only.
function parseAddresses(value: string): string[] {
  return (value.match(/[^\s<>",;]+@[^\s<>",;]+/g) ?? []).map((s) => s.toLowerCase());
}

// Normalizes any Gmail address to its mailbox key: dots removed, plus-tag kept.
// john.doe+Shop@gmail.com -> johndoe+shop ; john.doe@gmail.com -> johndoe
export function gmailKey(address: string): string | null {
  const m = address.match(/^([^@+]+)(?:\+([^@]*))?@(gmail\.com|googlemail\.com)$/i);
  if (!m) return null;
  const base = m[1].replace(/\./g, '').toLowerCase();
  const tag = (m[2] ?? '').toLowerCase();
  return tag ? `${base}+${tag}` : base;
}

function parseFrom(value: string): { name: string | null; address: string | null } {
  const m = value.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim() || null, address: m[2].trim() };
  return { name: null, address: value.trim() || null };
}

function decodeBase64Url(data: string): string {
  const b64 = data.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}

function findPart(part: GmailPart | undefined, mime: string): string | null {
  if (!part) return null;
  if (part.mimeType === mime && part.body?.data) return decodeBase64Url(part.body.data);
  for (const child of part.parts ?? []) {
    const found = findPart(child, mime);
    if (found) return found;
  }
  return null;
}

function extractBody(payload: GmailPart | undefined, fallback: string): string {
  const plain = findPart(payload, 'text/plain');
  if (plain) return plain;
  const html = findPart(payload, 'text/html');
  if (html) {
    // DOMParser does not run scripts or load images, so this is safe for text extraction.
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return (doc.body.textContent ?? '').replace(/\n{3,}/g, '\n\n').trim();
  }
  return fallback;
}

async function mapLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const item = items[next++];
      await fn(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

export interface AliasRef {
  id: number;
  match_key: string;
  alias_address: string;
}

export interface FetchedMessage {
  alias_id: number;
  gmail_id: string;
  to_address: string;
  from_name: string | null;
  from_address: string | null;
  subject: string | null;
  snippet: string | null;
  body: string | null;
  received_at: string;
}

// Scans recent Gmail headers (read-only), keeps only messages addressed to one of the user's aliases.
export async function syncInbox(
  token: string,
  aliases: AliasRef[],
  skipIds: Set<string>,
  ignoredIds: Set<string>,
): Promise<{ rows: FetchedMessage[]; ignored: string[] }> {
  const rows: FetchedMessage[] = [];
  const ignored: string[] = [];
  if (!aliases.length) return { rows, ignored };

  const byKey = new Map(aliases.map((a) => [a.match_key, a] as const));
  const list = await gapi<{ messages?: { id: string }[] }>(
    token,
    `/messages?maxResults=100&q=${encodeURIComponent(SEARCH_QUERY)}`,
  );
  const candidates = (list.messages ?? [])
    .map((m) => m.id)
    .filter((id) => !skipIds.has(id) && !ignoredIds.has(id))
    .slice(0, MAX_CANDIDATES);

  await mapLimit(candidates, CONCURRENCY, async (id) => {
    try {
      const meta = await gapi<GmailMessage>(
        token,
        `/messages/${id}?format=metadata&metadataHeaders=To&metadataHeaders=Cc&metadataHeaders=Delivered-To&metadataHeaders=X-Original-To`,
      );
      const addresses = ['To', 'Cc', 'Delivered-To', 'X-Original-To'].flatMap((n) => parseAddresses(header(meta.payload, n)));
      const keys = [...new Set(addresses.map(gmailKey).filter((k): k is string => !!k))];
      const matched = keys.map((k) => byKey.get(k)).filter((a): a is AliasRef => !!a);
      if (!matched.length) {
        ignored.push(id);
        return;
      }
      const full = await gapi<GmailMessage>(token, `/messages/${id}?format=full`);
      const from = parseFrom(header(full.payload, 'From'));
      const subject = header(full.payload, 'Subject') || null;
      const snippet = (full.snippet ?? '').slice(0, 400);
      const body = extractBody(full.payload, snippet).slice(0, BODY_LIMIT);
      const receivedAt = new Date(Number(full.internalDate ?? Date.now())).toISOString();
      for (const alias of matched) {
        rows.push({
          alias_id: alias.id,
          gmail_id: id,
          to_address: alias.alias_address,
          from_name: from.name,
          from_address: from.address,
          subject,
          snippet,
          body,
          received_at: receivedAt,
        });
      }
    } catch (e) {
      // Auth errors must stop the sync; other per-message errors are retried on the next sync.
      if (e instanceof GmailAuthError) throw e;
    }
  });

  return { rows, ignored };
}

// ---------- local memory of messages that matched no alias (per user, per browser) ----------

const ignoredKey = (uid: string) => `masveh.ignored.${uid}`;

export function loadIgnored(uid: string): Set<string> {
  try {
    const arr: unknown = JSON.parse(localStorage.getItem(ignoredKey(uid)) ?? '[]');
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

export function saveIgnored(uid: string, ids: Set<string>) {
  localStorage.setItem(ignoredKey(uid), JSON.stringify([...ids].slice(-2000)));
}

export function clearIgnored(uid: string) {
  localStorage.removeItem(ignoredKey(uid));
}
