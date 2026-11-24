import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { errorMessage } from '../lib/alias';
import {
  GmailAuthError,
  clearGmailSession,
  clearIgnored,
  fetchGoogleEmail,
  getGmailSession,
  loadIgnored,
  requestGmailToken,
  revokeGmailToken,
  saveGmailSession,
  saveIgnored,
  syncInbox,
  type GmailSession,
} from '../lib/gmail';
import type { Alias, CreatePayload, GmailAccount, Message, ToastState } from '../lib/types';
import AppHeader from '../components/AppHeader';
import { GmailConnectCard, GmailStrip } from '../components/GmailConnectCard';
import AliasComposer from '../components/AliasComposer';
import AliasList from '../components/AliasList';
import InboxPanel from '../components/InboxPanel';
import Toast from '../components/Toast';
import MobileNav, { type MobileView } from '../components/MobileNav';

const SYNC_INTERVAL_MS = 45000;
const EMPTY_ACCOUNT: GmailAccount = { connected: false, email: null, local: null, base: null, connected_at: null, last_sync_at: null };

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const userId = user?.id ?? '';

  const [account, setAccount] = useState<GmailAccount>(EMPTY_ACCOUNT);
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [gmail, setGmail] = useState<GmailSession | null>(() => getGmailSession());
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [creating, setCreating] = useState(false);
  const [selectedAliasId, setSelectedAliasId] = useState<number | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(null);
  const [bodyLoading, setBodyLoading] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [toast, setToast] = useState<ToastState | null>(null);
  const [mobileView, setMobileView] = useState<MobileView>('aliases');
  const syncingRef = useRef(false);

  const connected = account.connected;
  const hasGmail = !!gmail;

  const showToast = useCallback((text: string, tone: 'ok' | 'error' = 'ok') => setToast({ text, tone }), []);
  const closeToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, []);

  const loadAll = useCallback(async () => {
    try {
      setLoadError(null);
      const [acc, al, msg] = await Promise.all([
        api<GmailAccount>('gmail-account'),
        api<Alias[]>('aliases'),
        api<Message[]>('messages'),
      ]);
      setAccount(acc);
      setAliases(al);
      setMessages(msg);
      if (acc.last_sync_at) setLastSync((prev) => prev ?? new Date(acc.last_sync_at as string));
    } catch (e) {
      setLoadError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const refreshMessages = useCallback(async () => {
    const fresh = await api<Message[]>('messages');
    setMessages(fresh);
  }, []);

  // Derive per-alias counters from the message list so optimistic updates stay consistent.
  const aliasStats = useMemo(() => {
    const map = new Map<number, { unread: number; total: number }>();
    for (const m of messages) {
      const s = map.get(m.alias_id) ?? { unread: 0, total: 0 };
      s.total += 1;
      if (!m.is_read) s.unread += 1;
      map.set(m.alias_id, s);
    }
    return map;
  }, [messages]);

  const aliasesView = useMemo<Alias[]>(
    () => aliases.map((a) => ({ ...a, unread: aliasStats.get(a.id)?.unread ?? 0, total: aliasStats.get(a.id)?.total ?? 0 })),
    [aliases, aliasStats],
  );

  const aliasAddressById = useMemo(() => {
    const rec: Record<number, string> = {};
    for (const a of aliases) rec[a.id] = a.alias_address;
    return rec;
  }, [aliases]);

  const totalUnread = messages.filter((m) => !m.is_read).length;

  const visibleMessages = useMemo(
    () => (selectedAliasId === null ? messages : messages.filter((m) => m.alias_id === selectedAliasId)),
    [messages, selectedAliasId],
  );

  const selectedMessage = messages.find((m) => m.id === selectedMessageId) ?? null;
  const selectedAlias = aliasesView.find((a) => a.id === selectedAliasId) ?? null;

  const runSync = useCallback(
    async (silent: boolean, aliasList: Alias[] = aliases) => {
      if (!gmail || !connected || !userId || syncingRef.current) return;
      syncingRef.current = true;
      setSyncing(true);
      try {
        const known = await api<{ gmail_id: string; alias_id: number }[]>('messages?ids=1');
        const skip = new Set(known.map((k) => k.gmail_id));
        const ignored = loadIgnored(userId);
        const { rows, ignored: newlyIgnored } = await syncInbox(gmail.accessToken, aliasList, skip, ignored);
        newlyIgnored.forEach((id) => ignored.add(id));
        saveIgnored(userId, ignored);
        if (rows.length) await api('messages', { method: 'POST', body: { messages: rows } });
        await api('gmail-account', { method: 'PUT' });
        await refreshMessages();
        setLastSync(new Date());
        if (!silent) {
          showToast(rows.length ? `התקבלו ${rows.length} הודעות חדשות` : 'הסנכרון הושלם. אין הודעות חדשות לכינויים');
        }
      } catch (e) {
        if (e instanceof GmailAuthError) {
          clearGmailSession();
          setGmail(null);
          showToast('החיבור ל-Gmail פג תוקפו. חבר מחדש כדי להמשיך לקבל הודעות.', 'error');
        } else if (!silent) {
          showToast(errorMessage(e), 'error');
        }
      } finally {
        syncingRef.current = false;
        setSyncing(false);
      }
    },
    [gmail, connected, userId, aliases, refreshMessages, showToast],
  );

  // Keep a ref to the latest sync so intervals never call a stale closure.
  const runSyncRef = useRef(runSync);
  useEffect(() => {
    runSyncRef.current = runSync;
  });

  useEffect(() => {
    if (!connected || !hasGmail) return;
    void runSyncRef.current(true);
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      if (!getGmailSession()) {
        setGmail(null);
        showToast('החיבור ל-Gmail פג. חבר מחדש כדי להמשיך לקבל הודעות.', 'error');
        return;
      }
      void runSyncRef.current(true);
    }, SYNC_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [connected, hasGmail, showToast]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { accessToken, expiresIn } = await requestGmailToken(connected ? '' : 'select_account');
      const email = await fetchGoogleEmail(accessToken);
      if (!/@(gmail|googlemail)\.com$/.test(email)) {
        revokeGmailToken(accessToken);
        throw new Error('רק חשבונות Gmail אישיים (@gmail.com) נתמכים. חשבונות Google Workspace שאינם @gmail.com אינם נתמכים.');
      }
      if (connected && account.email && account.email !== email) {
        revokeGmailToken(accessToken);
        throw new Error(`החיבור הנוכחי הוא ${account.email}. נתק אותו לפני חיבור חשבון אחר.`);
      }
      await api('gmail-account', { method: 'POST', body: { email } });
      const session: GmailSession = { accessToken, expiresAt: Date.now() + (expiresIn - 60) * 1000, email };
      saveGmailSession(session);
      setGmail(session);
      await loadAll();
      showToast(`חשבון ${email} חובר בהצלחה`);
    } catch (e) {
      showToast(errorMessage(e), 'error');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('לנתק את חשבון Gmail? כל הכינויים וההודעות שנשמרו באפליקציה יימחקו (המיילים ב-Gmail עצמם לא יימחקו).')) return;
    try {
      await api('gmail-account', { method: 'DELETE' });
      if (gmail) revokeGmailToken(gmail.accessToken);
      clearGmailSession();
      if (userId) clearIgnored(userId);
      setGmail(null);
      setAccount(EMPTY_ACCOUNT);
      setAliases([]);
      setMessages([]);
      setSelectedAliasId(null);
      setSelectedMessageId(null);
      setLastSync(null);
      showToast('החיבור נותק והנתונים נמחקו');
    } catch (e) {
      showToast(errorMessage(e), 'error');
    }
  };

  const handleCreate = async (payload: CreatePayload): Promise<boolean> => {
    setCreating(true);
    try {
      const created = await api<Alias>('aliases', { method: 'POST', body: payload });
      const nextAliases = [created, ...aliases];
      setAliases(nextAliases);
      setSelectedAliasId(created.id);
      setMobileView('aliases');
      if (userId) clearIgnored(userId);
      void navigator.clipboard?.writeText(created.alias_address).catch(() => undefined);
      showToast(`הכינוי נוצר והועתק: ${created.alias_address}`);
      if (gmail) void runSync(true, nextAliases);
      return true;
    } catch (e) {
      showToast(errorMessage(e), 'error');
      return false;
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteAlias = async (id: number) => {
    try {
      await api('aliases', { method: 'DELETE', body: { id } });
      setAliases((prev) => prev.filter((a) => a.id !== id));
      setMessages((prev) => prev.filter((m) => m.alias_id !== id));
      if (selectedAliasId === id) setSelectedAliasId(null);
      showToast('הכינוי נמחק וההודעות שלו הסרו מהאפליקציה');
    } catch (e) {
      showToast(errorMessage(e), 'error');
    }
  };

  const setRead = async (ids: number[], isRead: boolean) => {
    const set = new Set(ids);
    setMessages((prev) => prev.map((m) => (set.has(m.id) ? { ...m, is_read: isRead } : m)));
    try {
      await api('messages', { method: 'PUT', body: { ids, is_read: isRead } });
    } catch (e) {
      showToast(errorMessage(e), 'error');
      void refreshMessages();
    }
  };

  const openMessage = async (m: Message) => {
    setSelectedMessageId(m.id);
    if (!m.is_read) void setRead([m.id], true);
    if (m.body === undefined) {
      setBodyLoading(true);
      try {
        const full = await api<Message>(`messages?id=${m.id}`);
        setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, body: full.body ?? '' } : x)));
      } catch (e) {
        showToast(errorMessage(e), 'error');
      } finally {
        setBodyLoading(false);
      }
    }
  };

  const handleToggleRead = (m: Message) => void setRead([m.id], !m.is_read);

  const handleDeleteMessage = async (m: Message) => {
    setMessages((prev) => prev.filter((x) => x.id !== m.id));
    setSelectedMessageId(null);
    if (userId) {
      // Remember the Gmail id so the next sync does not re-import a message the user deleted here.
      const ignored = loadIgnored(userId);
      ignored.add(m.gmail_id);
      saveIgnored(userId, ignored);
    }
    try {
      await api('messages', { method: 'DELETE', body: { id: m.id } });
      showToast('ההודעה נמחקה מהאפליקציה');
    } catch (e) {
      showToast(errorMessage(e), 'error');
      void refreshMessages();
    }
  };

  const handleMarkAllRead = () => {
    const ids = visibleMessages.filter((m) => !m.is_read).map((m) => m.id);
    if (ids.length) void setRead(ids, true);
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('הועתק ללוח');
    } catch {
      showToast('לא ניתן להעתיק אוטומטית. העתק ידנית', 'error');
    }
  };

  const handleLogout = async () => {
    clearGmailSession();
    await signOut();
  };

  const handleSelectAlias = (id: number | null) => {
    setSelectedAliasId(id);
    setMobileView('inbox');
    setSelectedMessageId(null);
  };

  const inboxTitle = selectedAlias ? (selectedAlias.label || 'כינוי ללא שם') : 'כל ההודעות';
  const inboxSubtitle = selectedAlias
    ? selectedAlias.alias_address
    : `נאספו מהניות ${aliases.length} כינויים`;

  const gmailActive = connected && hasGmail;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader
        email={account.email}
        gmailActive={gmailActive}
        lastSync={lastSync}
        syncing={syncing}
        canSync={gmailActive}
        now={now}
        onSync={() => void runSync(false)}
        onLogout={() => void handleLogout()}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 pb-24 sm:px-6 sm:py-8 lg:pb-8">
        {loadError && (
          <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-rose/40 bg-rose/[0.07] p-4 sm:flex-row sm:items-center">
            <p className="text-sm text-paper/90">לא הצלחנו לטעון את הנתונים: {loadError}</p>
            <button
              type="button"
              onClick={() => { setLoading(true); void loadAll(); }}
              className="h-9 rounded-lg border border-rose/50 px-3 text-sm text-rose transition hover:bg-rose/10 sm:ms-auto"
            >
              נסה שוב
            </button>
          </div>
        )}

        {!loading && !connected && (
          <GmailConnectCard mode="connect" connecting={connecting} onConnect={() => void handleConnect()} />
        )}

        {!loading && connected && account.email && (
          <>
            {hasGmail ? (
              <GmailStrip
                email={account.email}
                lastSync={lastSync}
                syncing={syncing}
                now={now}
                onDisconnect={() => void handleDisconnect()}
              />
            ) : (
              <GmailConnectCard mode="reconnect" connecting={connecting} onConnect={() => void handleConnect()} />
            )}

            <div className="grid items-start gap-6 lg:grid-cols-[380px_1fr]">
              <aside className={`space-y-6 lg:sticky lg:top-24 ${mobileView === 'inbox' ? 'hidden lg:block' : 'block'}`}>
                <div className={mobileView === 'create' ? 'block' : 'hidden lg:block'}>
                  <AliasComposer account={account} aliases={aliasesView} creating={creating} onCreate={handleCreate} />
                </div>
                <div className={mobileView === 'aliases' ? 'block' : 'hidden lg:block'}>
                <AliasList
                  aliases={aliasesView}
                  selectedId={selectedAliasId}
                  totalMessages={messages.length}
                  totalUnread={totalUnread}
                  now={now}
                  onSelect={handleSelectAlias}
                  onDelete={(id) => void handleDeleteAlias(id)}
                  onCopy={(t) => void handleCopy(t)}
                />
                </div>
              </aside>

              <div className={`min-w-0 ${mobileView === 'inbox' ? 'block' : 'hidden lg:block'}`}>
              <InboxPanel
                messages={visibleMessages}
                title={inboxTitle}
                selectedAlias={selectedAlias}
                onMobileBack={() => setMobileView('aliases')}
                subtitle={inboxSubtitle}
                aliasAddressById={aliasAddressById}
                showAliasChip={selectedAliasId === null}
                selected={selectedMessage}
                bodyLoading={bodyLoading}
                loading={loading}
                syncing={syncing}
                canSync={gmailActive}
                now={now}
                onSelect={(m) => void openMessage(m)}
                onClearSelection={() => setSelectedMessageId(null)}
                onToggleRead={handleToggleRead}
                onDelete={(m) => void handleDeleteMessage(m)}
                onMarkAllRead={handleMarkAllRead}
                onSync={() => void runSync(false)}
                onCopy={(t) => void handleCopy(t)}
              />
              </div>
            </div>
          </>
        )}

        {loading && (
          <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
            <div className="shimmer h-[520px] rounded-2xl bg-panel/70" />
            <div className="shimmer h-[640px] rounded-2xl bg-panel/70" />
          </div>
        )}
      </main>

      {!loading && connected && (
        <MobileNav view={mobileView} onChange={setMobileView} unread={totalUnread} />
      )}

      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}
