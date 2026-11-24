import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, Mail, RefreshCw, ShieldCheck, Unplug, Eye, Ban } from 'lucide-react';
import { timeAgo } from '../lib/alias';

interface ConnectProps {
  mode: 'connect' | 'reconnect';
  connecting: boolean;
  onConnect: () => void;
}

export function GmailConnectCard({ mode, connecting, onConnect }: ConnectProps) {
  if (mode === 'reconnect') {
    return (
      <div className="card-surface flex flex-col gap-4 rounded-2xl border-amber/40 p-5 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber/15 text-amber">
            <AlertTriangle size={20} />
          </span>
          <div>
            <p className="font-semibold">החיבור ל-Gmail פג תוקפו</p>
            <p className="mt-0.5 text-sm text-muted">
              אישור הגישה נשמר כשעה בלבד, ולכן הסנכרון האוטומטי מושהה. ההודעות שכבר נשמרו זמינות.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onConnect}
          disabled={connecting}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-amber px-5 font-semibold text-ink transition hover:brightness-110 disabled:opacity-60 sm:ms-auto"
        >
          {connecting ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
          חבר מחדש
        </button>
      </div>
    );
  }

  const steps = [
    { icon: Mail, title: 'חבר את Gmail', text: 'בחלון Google הרשמי את חשבון ה-Gmail האישי שלך.' },
    { icon: ShieldCheck, title: 'אשר גישת קריאה', text: 'הרשאה נדרשת רק לקריאת הודעות. אף פעולה לא נשלחת ולא נמחקת מיילים.' },
    { icon: CheckCircle2, title: 'צור כינויים', text: 'יצירת כתובות שנבנות מהחשבון שלך ומקבלת את ההודעות.' },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-3xl border border-line bg-panel/80 p-6 sm:p-10"
    >
      <div className="pointer-events-none absolute -top-24 -start-16 h-72 w-72 rounded-full bg-amber/10 blur-3xl" />
      <div className="relative grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div>
          <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-amber">שלב 1 מתוך 1 — חיבור</p>
          <h1 className="font-display text-4xl font-bold leading-[1.1] sm:text-5xl">
            כינויי דואר שנבנים על חשבון Gmail שלך
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-paper/75">
            חבר את חשבון ה-Gmail שלך בקריאה בלבד. מכאן תוכל ליצור כתובות שנראות כמו <span dir="ltr" className="font-mono text-amber">you+shop@gmail.com</span> או <span dir="ltr" className="font-mono text-amber">y.ou@gmail.com</span>, לקרוא את ההודעות שנשלחו אליהן, ולנהל אותן מקום אחד.
          </p>

          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber/40 bg-amber/[0.07] p-4">
            <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber" />
            <p className="text-sm leading-6 text-paper/90">
              <strong className="font-semibold text-amber">חשוב: לא ניתן לבחור שם חופשי לפני ה-@.</strong>
              כל כינוי נבנה רק מתוך כתובת ה-Gmail המחובר: האותיות של השם שלך, נקודות שמוסיפים בין האותיות, או תג אחרי פלוס. זה מה שגוגל מנתב בפועל.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-line bg-ink/50 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-mint">
                <Eye size={16} /> מה האפליקציה רואה
              </div>
              <p className="text-sm leading-6 text-muted">גישת קריאה בלבד לכותרות ותוכן ההודעות שנשלחו לכינויים שיצרת. רק הודעות שתואמות לכינוי נשמרות במסד הנתונים.</p>
            </div>
            <div className="rounded-2xl border border-line bg-ink/50 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-rose">
                <Ban size={16} /> מה האפליקציה לא עושה
              </div>
              <p className="text-sm leading-6 text-muted">לא שולחת מיילים, לא מוחקת ולא משנה דבר ב-Gmail עצמו. הנתונים שנשמרים באפליקציה ניתנים למחיקה נפרדת.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onConnect}
            disabled={connecting}
            className="mt-8 inline-flex h-13 items-center gap-3 rounded-2xl bg-amber px-7 py-3.5 text-base font-bold text-ink shadow-[0_18px_40px_-18px_rgba(242,180,90,.8)] transition hover:-translate-y-0.5 hover:brightness-110 disabled:translate-y-0 disabled:opacity-60"
          >
            {connecting ? <Loader2 size={20} className="animate-spin" /> : <Mail size={20} />}
            {connecting ? 'מתחבר ל-Google…' : 'חבר חשבון Gmail'}
          </button>
          <div className="mt-4">
            <Link to="/guide" className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-amber">
              צריך הגדרה ראשונה? עקב אחר השלבים במדריך
              <ArrowLeft size={14} />
            </Link>
          </div>
        </div>

        <ol className="space-y-3">
          {steps.map((s, i) => (
            <motion.li
              key={s.title}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.1 }}
              className="flex gap-4 rounded-2xl border border-line bg-ink/40 p-5"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-panel-2 text-amber">
                <s.icon size={20} />
              </span>
              <div>
                <p className="font-semibold">
                  <span className="font-display text-amber">{i + 1}. </span>{s.title}
                </p>
                <p className="mt-1 text-sm leading-6 text-muted">{s.text}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </motion.section>
  );
}

interface StripProps {
  email: string;
  lastSync: Date | null;
  syncing: boolean;
  now: number;
  onDisconnect: () => void;
}

export function GmailStrip({ email, lastSync, syncing, now, onDisconnect }: StripProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-panel/70 px-4 py-3">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-mint/15 text-mint">
        <ShieldCheck size={16} />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-muted">חשבון Gmail מחובר (קריאה בלבד)</p>
        <p dir="ltr" className="truncate font-mono text-sm text-paper">{email}</p>
      </div>
      <p className="text-xs text-muted sm:ms-auto">
        {syncing ? 'מסנכר…' : lastSync ? `סונכרן ${timeAgo(lastSync.toISOString(), now)} · סנכרון אוטומטי כל 45 שניות` : 'טרם סונכרן'}
      </p>
      <button
        type="button"
        onClick={onDisconnect}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-sm text-muted transition hover:border-rose/50 hover:text-rose"
      >
        <Unplug size={14} />
        נתק חשבון
      </button>
    </div>
  );
}
