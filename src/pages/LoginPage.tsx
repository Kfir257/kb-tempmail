import { useState, type FormEvent } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Mail, ShieldCheck, Lock, AtSign } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import supabase from '../lib/supabase';
import { signInWithGoogle } from '../lib/googleAuth';

const DEMO_EMAIL = 'demo@example.com';
const DEMO_PASSWORD = 'password123';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function translateAuthError(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return 'אימייל או סיסמה שגויים';
  if (/already registered|already been registered/i.test(msg)) return 'כבר קיים חשבון עם כתובת האימייל הזו';
  if (/rate limit|too many/i.test(msg)) return 'בוצעו יותר מדי ניסיונות. המתן מעט ונסה שוב';
  return msg;
}

export default function LoginPage() {
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  const validate = () => {
    const next: { email?: string; password?: string } = {};
    if (!email.trim()) next.email = 'נדרש אימייל';
    else if (!EMAIL_RE.test(email.trim())) next.email = 'כתובת אימייל לא תקינה';
    if (password.length < 6) next.password = 'הסיסמה חייבת להכיל לפחות 6 תווים';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setInfo(null);
    if (!validate()) return;
    setBusy(true);
    try {
      const cred = { email: email.trim(), password };
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword(cred);
        if (error) setFormError(translateAuthError(error.message));
      } else {
        const { data, error } = await supabase.auth.signUp(cred);
        if (error) setFormError(translateAuthError(error.message));
        else if (!data.session) setInfo('נשלח אליך מייל לאישור החשבון. לאחר האישור התחבר כאן.');
      }
    } catch {
      setFormError('אין חיבור לשרת. בדוק את האינטרנט ונסה שוב.');
    } finally {
      setBusy(false);
    }
  };

  const fillDemo = () => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setErrors({});
    setFormError(null);
    setMode('signin');
  };

  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-6 sm:px-6 lg:flex-row lg:items-center lg:gap-16 lg:py-12">
        <section className="flex-1">
          <Link to="/guide" className="inline-flex items-center gap-2 text-sm text-muted transition hover:text-amber">
            <ArrowLeft size={14} /> הוראות החיבור וההגדרה
          </Link>
          <div className="mt-8 flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber text-ink shadow-[0_14px_30px_-12px_rgba(242,180,90,.7)]">
              <ShieldCheck size={24} strokeWidth={2.4} />
            </span>
            <span className="font-display text-3xl font-bold">מסווה</span>
          </div>
          <h1 className="mt-8 font-display text-5xl font-bold leading-[1.05] sm:text-6xl">
            כינויי דואר שנבנים<br />
            <span className="text-amber">על החשבון שלך.</span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-paper/70">
            שירות מייל זמני שמבוסס על חשבון Gmail אמיתי שלך. את מקבל כינויים שנראים כמו כתובות חדשות, ורואה את ההודעות שנשלחו אליהם במקום אחד.
          </p>

          <div className="mt-10 rounded-2xl border border-line bg-panel/60 p-5">
            <div dir="ltr" className="flex flex-wrap items-center gap-2 font-mono text-sm">
              <span className="rounded-lg border border-line bg-ink px-2.5 py-1.5 text-paper/90">you.name+shop@gmail.com</span>
              <span className="text-amber">→</span>
              <span className="rounded-lg bg-mint/15 px-2.5 py-1.5 text-mint">תיבת הדואר שלך</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">
              כל כינוי נגזר מחשבון ה-Gmail המחובר. לא ניתן לבחור שם חופשי לפני ה-@.
            </p>
          </div>
        </section>

        <section className="w-full max-w-md lg:w-[420px] lg:shrink-0">
          <div className="card-surface rounded-3xl p-7 sm:p-8">
            <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl border border-line bg-ink p-1" role="tablist">
              {(['signin', 'signup'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => { setMode(m); setFormError(null); setInfo(null); }}
                  className={`h-10 rounded-lg text-sm font-semibold transition ${mode === m ? 'bg-amber text-ink' : 'text-muted hover:text-paper'}`}
                >
                  {m === 'signin' ? 'התחברות' : 'יצירת חשבון'}
                </button>
              ))}
            </div>

            <form onSubmit={(e) => void submit(e)} noValidate className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium">אימייל</label>
                <div className="relative">
                  <AtSign size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    id="email"
                    type="email"
                    dir="ltr"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={!!errors.email}
                    className={`h-12 w-full rounded-xl border bg-ink ps-9 pe-3 text-sm focus:outline-none ${errors.email ? 'border-rose/60' : 'border-line focus:border-amber/60'}`}
                    placeholder="you@example.com"
                  />
                </div>
                {errors.email && <p className="mt-1.5 text-xs text-rose">{errors.email}</p>}
              </div>
              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium">סיסמה</label>
                <div className="relative">
                  <Lock size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    id="password"
                    type="password"
                    dir="ltr"
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={!!errors.password}
                    className={`h-12 w-full rounded-xl border bg-ink ps-9 pe-3 text-sm focus:outline-none ${errors.password ? 'border-rose/60' : 'border-line focus:border-amber/60'}`}
                    placeholder="••••••"
                  />
                </div>
                {errors.password && <p className="mt-1.5 text-xs text-rose">{errors.password}</p>}
              </div>

              {formError && <p role="alert" className="rounded-lg border border-rose/40 bg-rose/10 px-3 py-2 text-sm text-rose">{formError}</p>}
              {info && <p className="rounded-lg border border-mint/40 bg-mint/10 px-3 py-2 text-sm text-mint">{info}</p>}

              <button
                type="submit"
                disabled={busy}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber font-bold text-ink transition hover:brightness-110 disabled:opacity-60"
              >
                {busy && <Loader2 size={18} className="animate-spin" />}
                {mode === 'signin' ? 'התחבר' : 'צור חשבון'}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3 text-xs text-muted">
              <span className="h-px flex-1 bg-line" />
              או
              <span className="h-px flex-1 bg-line" />
            </div>

            <button
              type="button"
              onClick={() => signInWithGoogle('מסווה')}
              className="inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-line bg-panel-2 text-sm font-semibold transition hover:border-muted/60"
            >
              <Mail size={17} />
              התחברות עם Google
            </button>

            <button
              type="button"
              onClick={fillDemo}
              className="mt-4 w-full text-center text-xs text-muted transition hover:text-amber"
            >
              רוצה לנסות? מלא פרטי חשבון הדגמה
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
