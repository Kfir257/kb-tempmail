import { useMemo, useState } from 'react';
import { ArrowRight, CheckCheck, Clock, Copy, Inbox, Info, Loader2, Mail, MailOpen, RefreshCw, Search } from 'lucide-react';
import type { Alias, Message } from '../lib/types';
import { formatRemaining, timeAgo } from '../lib/alias';
import MessageReader from './MessageReader';

interface Props {
  messages: Message[];
  title: string;
  subtitle: string;
  aliasAddressById: Record<number, string>;
  showAliasChip: boolean;
  selectedAlias: Alias | null;
  selected: Message | null;
  bodyLoading: boolean;
  loading: boolean;
  syncing: boolean;
  canSync: boolean;
  now: number;
  onSelect: (m: Message) => void;
  onClearSelection: () => void;
  onToggleRead: (m: Message) => void;
  onDelete: (m: Message) => void;
  onMarkAllRead: () => void;
  onSync: () => void;
  onCopy: (text: string) => void;
  onMobileBack: () => void;
}

export default function InboxPanel(props: Props) {
  const {
    messages, title, subtitle, aliasAddressById, showAliasChip, selectedAlias, selected, bodyLoading, loading, syncing, canSync, now,
    onSelect, onClearSelection, onToggleRead, onDelete, onMarkAllRead, onSync, onCopy, onMobileBack,
  } = props;
  const [query, setQuery] = useState('');
  const [onlyUnread, setOnlyUnread] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return messages.filter((m) => {
      if (onlyUnread && m.is_read) return false;
      if (!q) return true;
      return [m.subject, m.from_name, m.from_address, m.snippet, m.to_address].some((v) => v?.toLowerCase().includes(q));
    });
  }, [messages, query, onlyUnread]);

  const unreadCount = messages.filter((m) => !m.is_read).length;

  return (
    <section className="card-surface flex min-h-[640px] flex-col overflow-hidden rounded-2xl">
      {selectedAlias && (
        <div className={`border-b border-line p-4 sm:p-5 ${selected ? 'hidden md:block' : ''}`}>
          <button
            type="button"
            onClick={onMobileBack}
            className="mb-3 inline-flex h-8 items-center gap-1 rounded-lg text-sm text-muted transition hover:text-paper md:hidden"
          >
            <ArrowRight size={16} />
            כל הכתובות
          </button>
          <p className="text-xs font-semibold tracking-wide text-muted">פרטי הכתובת</p>
          <div className="mt-2 flex items-center gap-2">
            <p dir="ltr" className="min-w-0 flex-1 break-all font-mono text-[15px] font-semibold text-amber">
              {selectedAlias.alias_address}
            </p>
            <button
              type="button"
              onClick={() => onCopy(selectedAlias.alias_address)}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-ink px-3 text-sm font-semibold transition hover:border-amber/50 hover:text-amber"
            >
              <Copy size={14} />
              העתק
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted">
            <span className="rounded-md border border-line px-2 py-1">{selectedAlias.kind === 'plus' ? 'תג פלוס' : 'נקודות'}</span>
            <span className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1">
              <Clock size={11} /> {formatRemaining(selectedAlias.expires_at, now)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1">
              <Inbox size={11} /> {selectedAlias.total} הודעות
            </span>
            {selectedAlias.unread > 0 && (
              <span className="rounded-md bg-mint/15 px-2 py-1 text-mint">{selectedAlias.unread} לא נקראו</span>
            )}
          </div>
          <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-muted">
            <Info size={13} className="mt-0.5 shrink-0 text-amber" />
            כתובת זו היא כינוי של תיבת ה-Gmail שחברת, לא חשבון נפרד. ההודעות שמוצגות כאן שויכו לכתובת שלפי כותרות הנמענים.
          </p>
        </div>
      )}

      <div className={`flex min-h-0 flex-1 flex-col md:flex-row ${selectedAlias ? '' : ''}`}>
        <div
          className={`${selected ? 'hidden md:flex' : 'flex'} min-h-0 flex-col border-line md:w-[300px] md:shrink-0 md:border-e xl:w-[360px]`}
        >
          <div className="space-y-3 border-b border-line p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="truncate font-display text-2xl font-bold">{title}</h2>
                <p dir="auto" className="truncate text-xs text-muted">{subtitle}</p>
              </div>
              <button
                type="button"
                onClick={onSync}
                disabled={!canSync || syncing}
                aria-label="רענן הודעות"
                title="רענן הודעות"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line text-muted transition hover:border-amber/50 hover:text-amber disabled:opacity-40"
              >
                <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
              </button>
            </div>

            <div className="relative">
              <Search size={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="חפש שולח, נושא או כתובת נמען…"
                aria-label="חיפוש בהודעות"
                className="h-10 w-full rounded-xl border border-line bg-ink ps-9 pe-3 text-sm placeholder:text-muted/60 focus:border-amber/60 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-1 rounded-lg border border-line bg-ink p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setOnlyUnread(false)}
                  aria-pressed={!onlyUnread}
                  className={`rounded-md px-2.5 py-1.5 transition ${!onlyUnread ? 'bg-panel-2 text-paper' : 'text-muted hover:text-paper'}`}
                >
                  הכל
                </button>
                <button
                  type="button"
                  onClick={() => setOnlyUnread(true)}
                  aria-pressed={onlyUnread}
                  className={`rounded-md px-2.5 py-1.5 transition ${onlyUnread ? 'bg-panel-2 text-paper' : 'text-muted hover:text-paper'}`}
                >
                  לא נקראו ({unreadCount})
                </button>
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={onMarkAllRead}
                  className="inline-flex items-center gap-1 text-xs text-muted transition hover:text-mint"
                >
                  <CheckCheck size={14} /> סמן הכל
                </button>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-px p-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2 rounded-xl p-3">
                    <div className="shimmer h-3 w-1/3 rounded-full bg-panel-2" />
                    <div className="shimmer h-3.5 w-4/5 rounded-full bg-panel-2" />
                    <div className="shimmer h-3 w-2/3 rounded-full bg-panel-2" />
                  </div>
                ))}
              </div>
            ) : visible.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-16 text-center">
                <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-line bg-ink text-muted">
                  <Inbox size={24} />
                </span>
                <p className="font-semibold">
                  {messages.length === 0 ? 'עדיין אין הודעות' : 'אין תוצאות'}
                </p>
                <p className="mt-1.5 max-w-[240px] text-sm leading-6 text-muted">
                  {messages.length === 0
                    ? 'כשיישלח מייל לכתובת הזו, הוא יופיע כאן בסנכרון ההבא. אפשר לחץ על רענון כדי לבדוק עכשיו.'
                    : 'נסה לשנות את החיפוש או את הסינון.'}
                </p>
              </div>
            ) : (
              <ul className="p-2">
                {visible.map((m) => {
                  const active = selected?.id === m.id;
                  const sender = m.from_name || m.from_address || 'שולח לא ידוע';
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(m)}
                        aria-current={active ? 'true' : undefined}
                        className={`group relative w-full rounded-xl px-3 py-3 text-start transition ${
                          active ? 'bg-amber/[0.09] ring-1 ring-amber/40' : 'hover:bg-panel-2/70'
                        }`}
                      >
                        {!m.is_read && <span className="absolute start-1.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-amber shadow-[0_0_8px_rgba(242,180,90,.9)]" />}
                        <div className="flex items-center gap-2 ps-2">
                          <span className={`truncate text-sm ${m.is_read ? 'text-paper/75' : 'font-semibold text-paper'}`}>{sender}</span>
                          <span className="ms-auto shrink-0 text-[11px] text-muted">{timeAgo(m.received_at, now)}</span>
                        </div>
                        <p className={`truncate ps-2 text-[13px] ${m.is_read ? 'text-muted' : 'text-paper/90'}`}>{m.subject || '(ללא נושא)'}</p>
                        <p className="line-clamp-1 ps-2 text-xs text-muted/80">{m.snippet}</p>
                        {showAliasChip && (
                          <span dir="ltr" className="mt-1.5 ms-2 inline-block max-w-full truncate rounded-md bg-ink px-1.5 py-0.5 font-mono text-[10px] text-mint/90">
                            {m.to_address || aliasAddressById[m.alias_id] || ''}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {!loading && messages.length > 0 && (
              <p className="mx-4 mb-4 mt-2 flex items-start gap-2 rounded-xl border border-dashed border-line p-3 text-[11px] leading-5 text-muted">
                <Info size={12} className="mt-0.5 shrink-0" />
                השיוך לכתובת מבוסס על כותרות הנמענים של Gmail (To, Cc, Delivered-To). לעתים הכתובת המקורית לא נחשפת בוודאות (למשל: BCC או הועברה), לכן השיוך עשוי להיות לא ודאי.
              </p>
            )}
          </div>
        </div>

        {selected ? (
          <MessageReader
            key={selected.id}
            message={selected}
            aliasAddress={aliasAddressById[selected.alias_id] ?? selected.to_address ?? ''}
            bodyLoading={bodyLoading}
            onBack={onClearSelection}
            onToggleRead={() => onToggleRead(selected)}
            onDelete={() => onDelete(selected)}
            onCopy={onCopy}
          />
        ) : (
          <div className="hidden min-h-[320px] flex-1 flex-col items-center justify-center p-10 text-center md:flex">
            <span className="mb-4 grid h-16 w-16 place-items-center rounded-2xl border border-line bg-ink text-amber">
              {bodyLoading ? <Loader2 size={26} className="animate-spin" /> : <MailOpen size={26} />}
            </span>
            <p className="font-display text-2xl font-bold">בחר הודעה לקריאה</p>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
              ההודעות מסוננות לפי הכתובת שבחרת. בחר כתובת אחרת מהרשימה לצפייה בהודעות שלה.
            </p>
            <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted"><Mail size={12} /> {messages.length} הודעות ברשימה</p>
          </div>
        )}
      </div>
    </section>
  );
}
