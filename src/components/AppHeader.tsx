import { Link } from 'react-router-dom';
import { BookOpen, LogOut, RefreshCw, ShieldCheck } from 'lucide-react';
import { timeAgo } from '../lib/alias';

interface Props {
  email: string | null;
  gmailActive: boolean;
  lastSync: Date | null;
  syncing: boolean;
  canSync: boolean;
  now: number;
  onSync: () => void;
  onLogout: () => void;
}

export default function AppHeader({ email, gmailActive, lastSync, syncing, canSync, now, onSync, onLogout }: Props) {
  return (
    <header className="safe-top sticky top-0 z-30 border-b border-line/70 bg-ink/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
        <Link to="/" className="group flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber text-ink shadow-[0_8px_24px_-8px_rgba(242,180,90,.6)] transition group-hover:rotate-[-6deg]">
            <ShieldCheck size={19} strokeWidth={2.4} />
          </span>
          <span className="font-display text-xl font-bold leading-none">מסווה</span>
        </Link>

        <div className="ms-auto flex min-w-0 items-center gap-2">
          {email && (
            <div className="hidden min-w-0 items-center gap-2 rounded-full border border-line bg-panel px-3 py-1.5 sm:flex">
              <span className={`h-2 w-2 shrink-0 rounded-full ${gmailActive ? 'bg-mint shadow-[0_0_10px_rgba(127,224,184,.8)]' : 'bg-rose'}`} />
              <span dir="ltr" className="max-w-[200px] truncate font-mono text-xs text-paper/85">{email}</span>
            </div>
          )}

          {canSync && (
            <button
              type="button"
              onClick={onSync}
              disabled={syncing}
              className="flex h-9 items-center gap-2 rounded-full border border-line bg-panel px-3 text-sm text-paper/85 transition hover:border-amber/50 hover:text-paper disabled:opacity-60"
              title="רענון הודעות"
            >
              <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
              <span className="hidden md:inline">
                {syncing ? 'מסנכר…' : lastSync ? `סונכרן ${timeAgo(lastSync.toISOString(), now)}` : 'סנכרן'}
              </span>
            </button>
          )}

          <Link
            to="/guide"
            className="flex h-9 items-center gap-2 rounded-full px-3 text-sm text-muted transition hover:text-paper"
          >
            <BookOpen size={15} />
            <span className="hidden sm:inline">מדריך</span>
          </Link>

          <button
            type="button"
            onClick={onLogout}
            className="grid h-9 w-9 place-items-center rounded-full text-muted transition hover:bg-panel hover:text-rose"
            title="התנתקות מהאפליקציה"
            aria-label="התנתקות"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
