import { useMemo, useState } from 'react';
import { Clock, Copy, Inbox, Info, Search, Trash2 } from 'lucide-react';
import type { Alias } from '../lib/types';
import { formatRemaining, isExpired } from '../lib/alias';

interface Props {
  aliases: Alias[];
  selectedId: number | null;
  totalMessages: number;
  totalUnread: number;
  now: number;
  onSelect: (id: number | null) => void;
  onDelete: (id: number) => void;
  onCopy: (text: string) => void;
}

function AliasRow({ alias, active, now, onSelect, onDelete, onCopy }: {
  alias: Alias;
  active: boolean;
  now: number;
  onSelect: () => void;
  onDelete: () => void;
  onCopy: () => void;
}) {
  const [armed, setArmed] = useState(false);
  const expired = isExpired(alias.expires_at, now);

  return (
    <li
      className={`group flex items-stretch gap-2 rounded-xl border transition ${
        active ? 'border-amber/60 bg-amber/[0.06]' : 'border-line bg-ink/40 hover:border-muted/40'
      } ${expired ? 'opacity-55' : ''}`}
    >
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 px-3.5 py-3 text-start" aria-pressed={active}>
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold">{alias.label || 'כינוי ללא שם'}</span>
          <span className="shrink-0 rounded-md border border-line px-1.5 py-px text-[10px] text-muted">
            {alias.kind === 'plus' ? 'תג' : 'נקודות'}
          </span>
          {alias.unread > 0 && (
            <span className="ms-auto grid h-5 min-w-5 place-items-center rounded-full bg-amber px-1.5 text-[11px] font-bold text-ink">
              {alias.unread}
            </span>
          )}
        </div>
        <p dir="ltr" className="mt-1 break-all font-mono text-[12.5px] leading-5 text-paper/85">{alias.alias_address}</p>
        <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted">
          <span className="inline-flex items-center gap-1"><Inbox size={11} /> {alias.total} הודעות</span>
          <span className={`inline-flex items-center gap-1 ${expired ? 'text-rose' : ''}`}>
            <Clock size={11} /> {formatRemaining(alias.expires_at, now)}
          </span>
        </div>
      </button>
      <div className="flex flex-col justify-center gap-1 pe-2">
        <button
          type="button"
          onClick={onCopy}
          title="העתק כתובת"
          aria-label="העתק כתובת"
          className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-panel-2 hover:text-amber"
        >
          <Copy size={15} />
        </button>
        <button
          type="button"
          onClick={() => {
            if (!armed) {
              setArmed(true);
              window.setTimeout(() => setArmed(false), 3000);
              return;
            }
            onDelete();
          }}
          title={armed ? 'לחץ שוב לאישור מחיקה' : 'מחק כינוי'}
          aria-label={armed ? 'אישור מחיקה' : 'מחק כינוי'}
          className={`grid h-9 place-items-center rounded-lg transition ${
            armed ? 'w-auto gap-1 bg-rose/15 px-2 text-[11px] font-semibold text-rose' : 'w-9 text-muted hover:bg-panel-2 hover:text-rose'
          }`}
        >
          <Trash2 size={15} />
          {armed && 'אישור'}
        </button>
      </div>
    </li>
  );
}

export default function AliasList({ aliases, selectedId, totalMessages, totalUnread, now, onSelect, onDelete, onCopy }: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return aliases;
    return aliases.filter((a) =>
      [a.alias_address, a.label ?? '', a.match_key].some((v) => v.toLowerCase().includes(q)),
    );
  }, [aliases, query]);

  return (
    <section className="card-surface rounded-2xl p-5">
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 className="font-display text-2xl font-bold">כתובות הכינוי <span className="text-base text-muted">({aliases.length})</span></h2>
      </div>

      <div className="relative mb-3">
        <Search size={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חפש כתובת או שם…"
          aria-label="חיפוש כתובות כינוי"
          dir="ltr"
          className="h-10 w-full rounded-xl border border-line bg-ink ps-9 pe-3 font-mono text-sm placeholder:font-sans placeholder:text-muted/60 focus:border-amber/60 focus:outline-none"
        />
      </div>

      <p className="mb-3 flex items-start gap-2 rounded-xl border border-line bg-ink/50 p-3 text-xs leading-5 text-muted">
        <Info size={14} className="mt-0.5 shrink-0 text-amber" />
        כל הכתובות הן כינויים של אותו חשבון Gmail, לא חשבונות נפרדים. בחר כתובת כדי לראות את הפרטים וההודעות שנשלחו אליה.
      </p>

      <ul className="space-y-2">
        <li>
          <button
            type="button"
            onClick={() => onSelect(null)}
            aria-pressed={selectedId === null}
            className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-3 text-start transition ${
              selectedId === null ? 'border-mint/50 bg-mint/[0.06]' : 'border-line bg-ink/40 hover:border-muted/40'
            }`}
          >
            <span className="text-sm font-semibold">כל ההודעות</span>
            <span className="flex items-center gap-2 text-xs text-muted">
              {totalUnread > 0 && <span className="rounded-full bg-mint px-2 py-0.5 font-bold text-ink">{totalUnread} חדשות</span>}
              {totalMessages} סה״כ
            </span>
          </button>
        </li>
        {filtered.map((a) => (
          <AliasRow
            key={a.id}
            alias={a}
            active={selectedId === a.id}
            now={now}
            onSelect={() => onSelect(a.id)}
            onDelete={() => onDelete(a.id)}
            onCopy={() => onCopy(a.alias_address)}
          />
        ))}
      </ul>

      {aliases.length === 0 && (
        <p className="mt-4 rounded-xl border border-dashed border-line p-4 text-center text-sm leading-6 text-muted">
          עדיין אין כתובות. צור אחת מהלשונית היצירה, והיא תופיע כאן.
        </p>
      )}
      {aliases.length > 0 && filtered.length === 0 && (
        <p className="mt-4 rounded-xl border border-dashed border-line p-4 text-center text-sm text-muted">
          לא נמצאה כתובת תואמת לחיפוש.
        </p>
      )}
    </section>
  );
}
