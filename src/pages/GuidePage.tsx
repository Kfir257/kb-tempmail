import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Copy, ExternalLink, KeyRound, Mail, ShieldCheck, Terminal, Wrench, Rocket } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const ENV_BLOCK = 'VITE_GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com\nVITE_GOOGLE_AUTH_PROXY=<כתובת הפרוקסי של הפריסה>';

function CopyBlock({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="relative mt-3">
      <pre dir="ltr" className="overflow-x-auto whitespace-pre rounded-xl border border-line bg-ink p-4 pe-12 font-mono text-[13px] leading-7 text-paper/90">{text}</pre>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setDone(true);
            window.setTimeout(() => setDone(false), 1600);
          } catch {
            setDone(false);
          }
        }}
        aria-label="העתק"
        className="absolute end-2 top-2 grid h-8 w-8 place-items-center rounded-lg border border-line bg-panel text-muted transition hover:text-amber"
      >
        {done ? <Check size={14} className="text-mint" /> : <Copy size={14} />}
      </button>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="relative ps-14">
      <span className="absolute start-0 top-0 grid h-10 w-10 place-items-center rounded-xl border border-amber/40 bg-amber/10 font-display text-lg font-bold text-amber">
        {n}
      </span>
      <h3 className="font-display text-xl font-bold">{title}</h3>
      <div className="mt-2 space-y-2.5 text-[15px] leading-7 text-paper/80">{children}</div>
    </li>
  );
}

function Section({ icon: Icon, title, id, children }: { icon: typeof Mail; title: string; id: string; children: ReactNode }) {
  return (
    <section id={id} className="card-surface scroll-mt-24 rounded-3xl p-6 sm:p-9">
      <div className="mb-7 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber text-ink">
          <Icon size={20} />
        </span>
        <h2 className="font-display text-3xl font-bold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

const TROUBLE: [string, string][] = [
  ['access_denied או "האפליקציה עדיין בבדיקה"', 'חשבון השירות נמצא במצב Testing והכתובת לא נמצאת ברשימת Test users. הוסף אותה ונסה שוב.'],
  ['הדפדפן חסם את חלון Google', 'אפשר חלונות קופצים לאתר הזה ונסה שוב.'],
  ['שגיאה 403 עם הודעת Gmail API', 'Gmail API לא הופעל בפרויקט Google Cloud. חזור לשלב 2.'],
  ['החיבור ל-Gmail פג תוקפו', 'אישור הגישה תקף שעה בלבד. לחץ על הכפתור חבר מחדש.'],
  ['origin_mismatch או redirect_uri_mismatch', 'כתובת האתר לא רשומה ב-Authorized JavaScript origins של ה-Client ID. הוסף אותה ונסה שוב.'],
  ['השולח שלי השיב לא מופיע ברשימה', 'הינך צריך להיות שולח לכתובת שנשלחה אליה. הודעות הנשלחות לפני יצירת הכתובת לא יופיעו.'],
];

export default function GuidePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber text-ink"><ShieldCheck size={19} strokeWidth={2.4} /></span>
          <span className="font-display text-xl font-bold">מסווה</span>
        </Link>
        <Link
          to={user ? '/' : '/login'}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-line px-4 text-sm font-semibold transition hover:border-amber/50 hover:text-amber"
        >
          {user ? 'חזרה לאפליקציה' : 'התחברות'}
          <ArrowLeft size={15} />
        </Link>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-4 pb-20 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-line bg-panel/70 p-7 sm:p-12">
          <div className="pointer-events-none absolute -end-20 -top-20 h-64 w-64 rounded-full bg-amber/10 blur-3xl" />
          <p className="relative text-xs font-semibold tracking-[0.2em] text-amber">מדריך התקנה</p>
          <h1 className="relative mt-3 font-display text-4xl font-bold leading-tight sm:text-6xl">חיבור Gmail, הגדרה ושימוש</h1>
          <p className="relative mt-5 max-w-2xl text-base leading-8 text-paper/75">
            העמוד הזה מסביר איך לחבר את חשבון ה-Gmail שלך, ליצור כינויים ולקרוא את ההודעות שנשלחו אליהן. חשוב לדעת: אפליקציה זו לא יכולה ליצור כתובות על שם חופשי. כל כינוי נגזר משם חשבון המחובר.
          </p>
          <div className="relative mt-8 grid gap-3 sm:grid-cols-3">
            {[
              { t: 'תג פלוס', ex: 'you+shop@gmail.com' },
              { t: 'נקודות', ex: 'y.o.u@gmail.com' },
              { t: 'נקודות + תג', ex: 'yo.u+news@gmail.com' },
            ].map((x) => (
              <div key={x.t} className="rounded-2xl border border-line bg-ink/60 p-4">
                <p className="text-xs text-muted">{x.t}</p>
                <p dir="ltr" className="mt-1 font-mono text-sm text-amber">{x.ex}</p>
              </div>
            ))}
          </div>
        </div>

        <nav aria-label="ניווט" className="flex flex-wrap gap-2 text-sm">
          {[
            ['#usage', 'שימוש באפליקציה'],
            ['#setup', 'הגדרה ב-Google Cloud'],
            ['#deploy', 'משתני סביבה והפעלה'],
            ['#trouble', 'פתרון תקלות'],
          ].map(([href, label]) => (
            <a key={href} href={href} className="rounded-full border border-line px-3.5 py-1.5 text-muted transition hover:border-amber/50 hover:text-amber">{label}</a>
          ))}
        </nav>

        <Section icon={Rocket} title="שימוש באפליקציה" id="usage">
          <ol className="space-y-8">
            <Step n={1} title="התחבר לאפליקציה">
              <p>היכנס עם האימייל והסיסמה שלך, או בעזרת כפתור ההתחברות עם Google. הפעלה הזו נוגעת לחשבון האפליקציה בלבד, ולא לחשבון ה-Gmail.</p>
            </Step>
            <Step n={2} title="חבר את חשבון Gmail האישי שלך">
              <p>לחץ על <strong className="text-paper">חבר חשבון Gmail</strong>, בחר את החשבון בחלון Google ואשר גישת קריאה ל-Gmail. אם הדפדפן חסם את החלון, אפשר חלונות קופצים לאתר הזה ונסה שוב.</p>
            </Step>
            <Step n={3} title="צור כינוי">
              <p>בחר סוג: <strong className="text-paper">אוטומטי</strong> (המערכת מנסה בשבילך), <strong className="text-paper">תג פלוס</strong> (הקלד תג שאתה בחר), או <strong className="text-paper">נקודות</strong> (לחץ בין האותיות להוספת נקודה). בחר משך תוקף ולחץ <strong className="text-paper">צור כינוי</strong>. הכתובת מועתקת ללוח אוטומטית.</p>
            </Step>
            <Step n={4} title="השתמש בכתובת באתר">
              <p>הדבק את הכתובת בשדה הרשמה באתר שאתה רוצה להירשם. שם אחר שלא יופיע ברשימה שלך אינו מזהה את הכינוי והוא ישרוט אותך.</p>
            </Step>
            <Step n={5} title="קרא ונהל הודעות">
              <p>הסנכרון רץ ברקע כל 45 שניות כשהלונית פעילה. סנן לפי כינוי בצד, סמן הודעות כנקראות, העתק כתובות, או מחק הודעה מהאפליקציה.</p>
            </Step>
          </ol>

          <div className="mt-10 rounded-2xl border border-amber/40 bg-amber/[0.07] p-5">
            <p className="font-semibold text-amber">הבהרה חשובה: מה האפליקציה יכולה לעשות ומה לא</p>
            <p className="mt-1.5 leading-7 text-paper/85">
              לא ניתן לבחור שם חופשי לפני ה-@. כל כתובת נבנית מתוך החשבון שחברת: האותיות של שם המשתמש שלך, נקודות שמוסיפות בין האותיות, או תג אחרי הפלוס. לכן אי אפשר ליצור כתובת שאינה קיימת ב-Gmail. האפליקציה לא יוצרת חשבונות חדשים, רק מסננת הודעות שנשלחו אליהן.
            </p>
          </div>
        </Section>

        <Section icon={Wrench} title="הגדרה ב-Google Cloud (למפעיל האפליקציה)" id="setup">
          <p className="mb-6 text-[15px] leading-7 text-paper/75">
            חלק זה נדרש רק פעם אחת, לפני פריסה חדשה של האפליקציה. צריך לצור מזהה לקוח (OAuth Client ID) שיאפשר לאפליקציה לבקש אישור גישה ל-Gmail.
          </p>
          <ol className="space-y-8">
            <Step n={1} title="פתח פרויקט ב-Google Cloud">
              <p>פתח <a className="text-amber underline-offset-4 hover:underline" href="https://console.cloud.google.com/" target="_blank" rel="noreferrer">console.cloud.google.com <ExternalLink size={11} className="inline" /></a> בהתחברות עם חשבון Google שלך. ברשימה העליונה לחץ על בחירת פרויקט ← <strong className="text-paper">פרויקט חדש</strong>.</p>
            </Step>
            <Step n={2} title="הפעל את Gmail API">
              <p>בתפריט הצד בשמאל: <strong className="text-paper">APIs &amp; Services ← Library</strong>. חפש <strong className="text-paper">Gmail API</strong> ולחץ <strong className="text-paper">Enable</strong>.</p>
            </Step>
            <Step n={3} title="הגדר מסך הסכמה (OAuth consent screen)">
              <p>בנוסף <strong className="text-paper">Google Auth Platform ← Branding</strong> מלא שם לאפליקציה ודואר תמיכה. בחר <strong className="text-paper">Audience ← External</strong>.</p>
              <p>ב-<strong className="text-paper">Data Access</strong> לחץ <strong className="text-paper">Add or remove scopes</strong> והוסף:</p>
              <CopyBlock text={'openid\nemail\nhttps://www.googleapis.com/auth/gmail.readonly'} />
              <p className="text-sm text-amber">חשוב: ההרשאה gmail.readonly היא מוגדרת כרגישה רגישה. במצב Testing בלבד ניתן לחבר רק חשבונות שנרשמו כמשתמשי בדיקה. לשימוש ציבורי נדרש אימות של Google.</p>
              <p>ב-<strong className="text-paper">Test users</strong> הוסף את כתובת ה-Gmail שלך (ושל כל מי שיחבר להשתמש). בלא זה תקבל שגיאת access_denied.</p>
            </Step>
            <Step n={4} title="צור Client ID מסוג Web application">
              <p>בתפריט <strong className="text-paper">Clients</strong> לחץ <strong className="text-paper">Create client</strong> ← סוג <strong className="text-paper">Web application</strong>. בשדה <strong className="text-paper">Authorized JavaScript origins</strong> הוסף:</p>
              <CopyBlock text={'https://<כתובת-האפליקציה-שלך>.vercel.app\nhttp://localhost:5173'} />
              <p>העתק את ה-<strong className="text-paper">Client ID</strong> שנוצר (נגמר ב-<span dir="ltr" className="font-mono">.apps.googleusercontent.com</span>).</p>
            </Step>
          </ol>
        </Section>

        <Section icon={KeyRound} title="משתני סביבה והפעלה" id="deploy">
          <ol className="space-y-8">
            <Step n={1} title="הגדר משתני סביבה ב-Vercel">
              <p>בפרויקט ב-Vercel עבור ל <strong className="text-paper">Settings ← Environment Variables</strong> והוסף את המשתנים הבאים, ואחר כך עשה Redeploy:</p>
              <CopyBlock text={ENV_BLOCK} />
              <p className="text-sm text-muted">פריסת Supabase ומפתחות השרת מוגדרים כבר בפרויקט. הוסף רק את שתי המשתנים החדשים.</p>
            </Step>
            <Step n={2} title="הפעלה מקומית (אופציונלי)">
              <p>להרצת האפליקציה מקומית, צור קובץ <span dir="ltr" className="font-mono">.env</span> עם המשתנים והרץ:</p>
              <CopyBlock text={'npm install\nnpm run dev'} />
              <p className="text-sm text-muted">הכתובת המקומית היא <span dir="ltr" className="font-mono">http://localhost:5173</span> — וודא שהיא רשומה ב-Authorized JavaScript origins.</p>
            </Step>
          </ol>
        </Section>

        <Section icon={Terminal} title="פתרון תקלות" id="trouble">
          <div className="overflow-hidden rounded-2xl border border-line">
            <table className="w-full text-start text-sm">
              <thead className="bg-ink/70 text-xs text-muted">
                <tr>
                  <th className="p-3 text-start font-semibold">הודעה או תסמין</th>
                  <th className="p-3 text-start font-semibold">הסיבה והפתרון</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {TROUBLE.map(([a, b]) => (
                  <tr key={a} className="align-top">
                    <td className="p-3 font-medium text-paper/90">{a}</td>
                    <td className="p-3 leading-6 text-muted">{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to={user ? '/' : '/login'} className="inline-flex h-12 items-center gap-2 rounded-xl bg-amber px-6 font-bold text-ink transition hover:brightness-110">
              {user ? 'חזרה לאפליקציה' : 'לעמוד ההתחברות'}
            </Link>
          </div>
        </Section>
      </main>
    </div>
  );
}
