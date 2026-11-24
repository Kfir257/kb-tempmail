import { useState } from 'react';
import { ChevronRight, Copy, Eye, EyeOff, Trash2, Lock } from 'lucide-react';
import type { Message } from '../lib/types';
import { formatDateTime } from '../lib/alias';

interface Props {
  message: Message;
  aliasAddress: string;
  bodyLoading: boolean;
  onBack: () => void;
  onToggleRead: () => void;
  onDelete: () => void;
  onCopy: (text: string) => void;
}

export default function MessageReader({ message, aliasAddress, bodyLoading, onBack, onToggleRead, onDelete, onCopy }: Props) {
  const [armed, setArmed] = useState(false);
  const sender = message.from_name || message.from_address || 'שולח לא ידוע';
  const initial = sender.trim().charAt(0).toUpperCase() || '?';

  return (
    <article className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm text-muted transition hover:text-paper md:hidden"
        >
          <ChevronRight size={18} />
          חזר
        </button>
        <div className="ms-auto flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleRead}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm text-muted transition hover:bg-panel-2 hover:text-paper"
          >
            {message.is_read ? <EyeOff size={15} /> : <Eye size={15} />}
            {message.is_read ? 'סמן כלא נקרא' : 'סמן כנקרא'}
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
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm transition ${
              armed ? 'bg-rose/15 text-rose' : 'text-muted hover:bg-panel-2 hover:text-rose'
            }`}
          >
            <Trash2 size={15} />
            {armed ? 'לחץ שוב למחיקה' : 'מחק'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        <h3 className="font-display text-2xl font-bold leading-snug sm:text-3xl">{message.subject || '(ללא נושא)'}</h3>

        <div className="mt-5 flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber to-rose font-display text-lg font-bold text-ink">
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{sender}</p>
            {message.from_address && message.from_name && (
              <p dir="ltr" className="truncate font-mono text-xs text-muted">{message.from_address}</p>
            )}
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
              <span>נשלח אל:</span>
              <button
                type="button"
                onClick={() => onCopy(aliasAddress)}
                dir="ltr"
                className="inline-flex items-center gap-1.5 rounded-md border border-line bg-ink px-2 py-0.5 font-mono text-[12px] text-paper/90 transition hover:border-amber/50 hover:text-amber"
              >
                {aliasAddress}
                <Copy size={11} />
              </button>
              <span className="ms-auto">{formatDateTime(message.received_at)}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-line pt-6">
          {bodyLoading ? (
            <div className="space-y-3">
              {[90, 75, 85, 60].map((w, i) => (
                <div key={i} className="shimmer h-3.5 rounded-full bg-panel-2" style={{ width: `${w}%` }} />
              ))}
            </div>
          ) : (
            <div className="whitespace-pre-wrap break-words text-[15.5px] leading-8 text-paper/90">
              {message.body || message.snippet || '(ההודעה ריקה מהתוכן הטקסטואלי)'}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-line px-4 py-2.5 text-[11px] text-muted sm:px-6">
        <Lock size={12} />
        התוכן מוצג כטקסט בלבד — ללא טעינת תמונות או מעקבים. מחיקה מהאפליקציה לא מוחקת את המייל ב-Gmail.
      </div>
    </article>
  );
}
