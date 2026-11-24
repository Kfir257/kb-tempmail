export const TAG_RE = /^[a-z0-9](?:[a-z0-9_-]{0,28}[a-z0-9])?$/;

export const TTL_OPTIONS: { value: number | null; label: string }[] = [
  { value: 1, label: 'שעה אחת' },
  { value: 24, label: '24 שעות' },
  { value: 168, label: '7 ימים' },
  { value: null, label: 'ללא הגבלה' },
];

// Inserts a dot after the letter at index (position - 1) for every position.
export function dottedFrom(base: string, positions: number[]): string {
  let out = '';
  for (let i = 0; i < base.length; i++) {
    out += base[i];
    if (i < base.length - 1 && positions.includes(i + 1)) out += '.';
  }
  return out;
}

const rtf = new Intl.RelativeTimeFormat('he', { numeric: 'auto' });

export function timeAgo(iso: string, now: number): string {
  const diffSec = (new Date(iso).getTime() - now) / 1000;
  const abs = Math.abs(diffSec);
  if (abs < 60) return 'עכשיו';
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  return rtf.format(Math.round(diffSec / 86400), 'day');
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('he-IL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isExpired(expiresAt: string | null, now: number): boolean {
  return !!expiresAt && new Date(expiresAt).getTime() <= now;
}

export function formatRemaining(expiresAt: string | null, now: number): string {
  if (!expiresAt) return 'ללא תפוגה';
  const ms = new Date(expiresAt).getTime() - now;
  if (ms <= 0) return 'פג תוקף';
  const totalMin = Math.floor(ms / 60000);
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  const days = Math.floor(hours / 24);
  if (days >= 1) return `נותרו ${days} ימים ו-${hours % 24} ש׳`;
  if (hours >= 1) return `נותרו ${hours} ש׳ ${minutes} דק׳`;
  return `נותרו ${Math.max(minutes, 1)} דק׳`;
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'אירעה שגיאה לא צפויה';
}
