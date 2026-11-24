import { AtSign, Inbox, Plus } from 'lucide-react';

export type MobileView = 'create' | 'aliases' | 'inbox';

interface Props {
  view: MobileView;
  onChange: (view: MobileView) => void;
  unread: number;
}

export default function MobileNav({ view, onChange, unread }: Props) {
  const items: { id: MobileView; label: string; icon: typeof AtSign; badge?: number }[] = [
    { id: 'aliases', label: 'כתובות', icon: AtSign },
    { id: 'inbox', label: 'הודעות', icon: Inbox, badge: unread },
    { id: 'create', label: 'יצירה', icon: Plus },
  ];

  return (
    <nav
      aria-label="ניווט ראשי"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/90 backdrop-blur-xl lg:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-3 gap-1 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {items.map((item) => {
          const active = view === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`relative flex flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] font-semibold transition ${
                active ? 'text-amber' : 'text-muted hover:text-paper'
              }`}
            >
              <span
                className={`grid h-9 w-14 place-items-center rounded-full transition ${
                  active ? 'bg-amber/15' : ''
                }`}
              >
                <item.icon size={20} strokeWidth={active ? 2.4 : 2} />
              </span>
              {item.label}
              {!!item.badge && item.badge > 0 && (
                <span className="absolute end-3 top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-mint px-1.5 text-[10px] font-bold text-ink">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
