import { useState, type FormEvent } from 'react';
import { Dices, Hash, Loader2, Plus, Sparkles, AlertCircle } from 'lucide-react';
import type { Alias, CreatePayload, GmailAccount } from '../lib/types';
import { TAG_RE, TTL_OPTIONS, dottedFrom } from '../lib/alias';

type Mode = 'auto' | 'plus' | 'dot';

interface Props {
  account: GmailAccount;
  aliases: Alias[];
  creating: boolean;
  onCreate: (payload: CreatePayload) => Promise<boolean>;
}

const MODES: { id: Mode; label: string; hint: string; icon: typeof Plus }[] = [
  { id: 'auto', label: 'אוטומטי', hint: 'המערכת בחירה עבורך', icon: Sparkles },
  { id: 'plus', label: 'תג פלוס', hint: 'name+tag@gmail.com', icon: Plus },
  { id: 'dot', label: 'נקודות', hint: 'n.ame@gmail.com', icon: Dices },
];

export default function AliasComposer({ account, aliases, creating, onCreate }: Props) {
  const local = account.local ?? '';
  const base = account.base ?? '';

  const [mode, setMode] = useState<Mode>('auto');
  const [tag, setTag] = useState('');
  const [positions, setPositions] = useState<number[]>([]);
  const [label, setLabel] = useState('');
  const [ttl, setTtl] = useState<number | null>(24);
  const [submitted, setSubmitted] = useState(false);

  const tagNorm = tag.trim().toLowerCase();
  const tagFormatError = tagNorm && !TAG_RE.test(tagNorm)
    ? 'מותר: אותיות לטיניות, ספרות, מקף (-) וקו תחתון (_), עד 30 תווים'
    : null;

  const dottedLocal = positions.length ? dottedFrom(base, positions) : local;

  let blocking: string | null = null;
  if (mode === 'plus' && !tagNorm) blocking = 'נדרש תג (הטקסט שאחרי הפלוס)';
  else if (mode === 'dot' && !positions.length && !tagNorm) blocking = 'בחר נקודה אחת על לפחות, או הוסף תג';
  else if (mode === 'dot' && !tagNorm && dottedLocal === local) blocking = 'זו הכתובת הראשית של החשבון. בחר מיקום נקודה אחר או הוסף תג';
  else if (tagFormatError) blocking = tagFormatError;

  const duplicateKey = mode === 'plus'
    ? `${base}+${tagNorm}`
    : tagNorm ? `${base}+${tagNorm}` : base;
  const duplicate = mode !== 'auto' && !blocking
    ? aliases.find((a) => a.match_key === duplicateKey)
    : undefined;
  const duplicateError = duplicate ? `כבר קיים כינוי שמנותב לאותה תיבה: ${duplicate.alias_address}` : null;

  const errorToShow = blocking ?? duplicateError;
  const showError = !!errorToShow && (submitted || tagNorm.length > 0 || positions.length > 0);

  const toggleDot = (pos: number) => {
    setPositions((prev) => (prev.includes(pos) ? prev.filter((p) => p !== pos) : [...prev, pos].sort((a, b) => a - b)));
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setSubmitted(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (mode !== 'auto' && errorToShow) return;
    const ok = await onCreate({
      mode,
      tag: mode === 'auto' ? undefined : tagNorm || undefined,
      dot_positions: mode === 'dot' ? positions : undefined,
      label: label.trim() || undefined,
      ttl_hours: ttl,
    });
    if (ok) {
      setTag('');
      setPositions([]);
      setLabel('');
      setSubmitted(false);
    }
  };

  return (
    <section className="card-surface rounded-2xl p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">כינוי חדש</h2>
          <p className="mt-0.5 text-sm text-muted">נבנה מחשבון ה-Gmail שלך בלבד</p>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-amber/30 bg-amber/[0.06] p-3.5">
        <p className="text-[13px] leading-6 text-paper/85">
          <strong className="text-amber">רק כינויים מבוססים על החשבון המחובר.</strong> האותיות לפני ה-@ הן תמיד אותיות של השם שלך בלבד (עם או בלי נקודות), והחלק הנוסף הוא תג אחרי פלוס. אי אפשר לבחור שם חופשי לפני ה-@.
        </p>
        <div dir="ltr" className="mt-2.5 flex flex-wrap items-center gap-1 font-mono text-[12px] text-muted">
          <span className="rounded bg-ink px-1.5 py-0.5 text-paper/90">{local || 'your.name'}</span>
          <span>+</span>
          <span className="rounded bg-ink px-1.5 py-0.5 text-amber">tag</span>
          <span>@gmail.com</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div role="radiogroup" aria-label="סוג כינוי" className="grid grid-cols-3 gap-1.5 rounded-xl border border-line bg-ink/60 p-1">
          {MODES.map((m) => {
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => switchMode(m.id)}
                className={`flex flex-col items-center gap-0.5 rounded-lg px-2 py-2 text-center transition ${
                  active ? 'bg-amber text-ink shadow-md' : 'text-muted hover:text-paper'
                }`}
              >
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  <m.icon size={14} />
                  {m.label}
                </span>
                <span dir="ltr" className={`font-mono text-[10px] ${active ? 'text-ink/70' : 'text-muted/70'}`}>{m.hint}</span>
              </button>
            );
          })}
        </div>

        {mode === 'auto' && (
          <p className="rounded-xl border border-dashed border-line p-3 text-sm leading-6 text-muted">
            המערכת תבחר בשבילך כתובת קצרה מתוך חשבונך (תג פלוס או נקודות), והיא תהיה פנויה במסד הנתונים.
          </p>
        )}

        {mode === 'plus' && (
          <div>
            <label htmlFor="alias-tag" className="mb-1.5 block text-sm font-medium">תג (הטקסט אחרי הפלוס)</label>
            <div dir="ltr" className="flex items-center overflow-hidden rounded-xl border border-line bg-ink focus-within:border-amber/60">
              <span className="px-3 font-mono text-sm text-muted">{local || 'you'}+</span>
              <input
                id="alias-tag"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="shop"
                autoComplete="off"
                spellCheck={false}
                className="min-w-0 flex-1 bg-transparent py-3 font-mono text-sm text-amber placeholder:text-muted/50 focus:outline-none"
              />
              <span className="px-3 font-mono text-sm text-muted">@gmail.com</span>
            </div>
          </div>
        )}

        {mode === 'dot' && (
          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-sm font-medium">הוסף נקודות בין האותיות</p>
              <div dir="ltr" className="flex flex-wrap items-center rounded-xl border border-line bg-ink px-3 py-2.5 font-mono text-lg">
                {base.split('').map((ch, i) => {
                  const pos = i + 1;
                  const on = positions.includes(pos);
                  return (
                    <span key={`${ch}-${i}`} className="flex items-center">
                      <span className="text-paper">{ch}</span>
                      {i < base.length - 1 && (
                        <button
                          type="button"
                          aria-label={`${on ? 'הסר נקודה' : 'הוסף נקודה'} אחרי ${ch}`}
                          aria-pressed={on}
                          onClick={() => toggleDot(pos)}
                          className="group grid h-7 w-5 place-items-center"
                        >
                          <span
                            className={`block rounded-full transition-all ${
                              on ? 'h-2 w-2 bg-amber shadow-[0_0_8px_rgba(242,180,90,.8)]' : 'h-1 w-1 bg-line group-hover:bg-muted'
                            }`}
                          />
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>
              <p className="mt-1.5 text-xs text-muted">לחץ בין האותיות כדי להוסיף או להסיר נקודה. גוגל מתעלם מנקודות באותו אופן ומגיע אליך אותו מאותו התיבה.</p>
            </div>
            <div>
              <label htmlFor="alias-tag-dot" className="mb-1.5 block text-sm font-medium">תג פלוס <span className="font-normal text-muted">(אופציונלי)</span></label>
              <div dir="ltr" className="flex items-center overflow-hidden rounded-xl border border-line bg-ink focus-within:border-amber/60">
                <span className="ps-3 font-mono text-sm text-muted">+</span>
                <input
                  id="alias-tag-dot"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="news"
                  autoComplete="off"
                  spellCheck={false}
                  className="min-w-0 flex-1 bg-transparent py-3 ps-1 font-mono text-sm text-amber placeholder:text-muted/50 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="alias-label" className="mb-1.5 block text-sm font-medium">שם לזיהוי <span className="font-normal text-muted">(אופציונלי)</span></label>
            <input
              id="alias-label"
              value={label}
              maxLength={60}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="קניות באמזון"
              className="h-11 w-full rounded-xl border border-line bg-ink px-3 text-sm placeholder:text-muted/50 focus:border-amber/60 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="alias-ttl" className="mb-1.5 block text-sm font-medium">תוקף</label>
            <select
              id="alias-ttl"
              value={ttl === null ? 'never' : String(ttl)}
              onChange={(e) => setTtl(e.target.value === 'never' ? null : Number(e.target.value))}
              className="h-11 w-full cursor-pointer rounded-xl border border-line bg-ink px-3 text-sm focus:border-amber/60 focus:outline-none"
            >
              {TTL_OPTIONS.map((o) => (
                <option key={o.label} value={o.value === null ? 'never' : o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div dir="ltr" className="flex min-h-[44px] items-center gap-2 overflow-hidden rounded-xl border border-dashed border-line/80 bg-ink/50 px-3 py-2.5 font-mono text-[13px]">
          <Hash size={14} className="shrink-0 text-muted" />
          <span className="truncate text-paper/90">
            {mode === 'auto' && (
              <>{local}<span className="text-amber">+…</span>@gmail.com</>
            )}
            {mode === 'plus' && (
              <>{local}<span className="text-amber">+{tagNorm || '…'}</span>@gmail.com</>
            )}
            {mode === 'dot' && (
              <>
                <span>{dottedLocal}</span>
                {tagNorm && <span className="text-amber">+{tagNorm}</span>}
                @gmail.com
              </>
            )}
          </span>
        </div>

        {showError && (
          <p role="alert" className="flex items-start gap-2 text-sm text-rose">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {errorToShow}
          </p>
        )}

        <button
          type="submit"
          disabled={creating}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber font-bold text-ink shadow-[0_14px_30px_-16px_rgba(242,180,90,.9)] transition hover:brightness-110 disabled:opacity-60"
        >
          {creating ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} strokeWidth={2.6} />}
          {creating ? 'יוצר…' : 'צור כינוי והעתק'}
        </button>
      </form>
    </section>
  );
}
