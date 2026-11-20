import { useState } from 'react';
import { useT, locale } from '../lib/i18n.js';
import {
  useCloudStore,
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  sendPasswordReset,
  signOut,
  syncNow,
  deleteCloudData
} from '../lib/cloudSync.js';

/** Karta „Konto i synchronizacja” w Ustawieniach. Bez konfiguracji Supabase nie renderuje się. */
export default function AccountCard() {
  const t = useT();
  const { enabled, ready, user, syncing, lastSync, error } = useCloudStore();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { kind: 'ok' | 'err', text }

  if (!enabled) return null;

  const run = async (fn) => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
    } catch (e) {
      setMessage({ kind: 'err', text: t(`account.err.${e.code || 'generic'}`) });
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim() || password.length < 6) {
      setMessage({ kind: 'err', text: t('account.err.fillIn') });
      return;
    }
    run(async () => {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
      } else {
        const needsConfirm = await signUpWithEmail(email, password);
        if (needsConfirm) setMessage({ kind: 'ok', text: t('account.confirmEmail') });
      }
      setPassword('');
    });
  };

  const handleReset = () => {
    if (!email.trim()) {
      setMessage({ kind: 'err', text: t('account.err.emailFirst') });
      return;
    }
    run(async () => {
      await sendPasswordReset(email);
      setMessage({ kind: 'ok', text: t('account.resetSent') });
    });
  };

  const handleDeleteCloud = () => {
    if (!window.confirm(t('account.deleteConfirm'))) return;
    run(deleteCloudData);
  };

  return (
    <div className="card mb-3">
      <h2 className="text-sm text-primary font-medium m-0 mb-2">☁️ {t('account.title')}</h2>

      {!ready ? (
        <p className="text-xs text-muted m-0">{t('common.loading')}</p>
      ) : user ? (
        <>
          <p className="text-xs text-secondary m-0 mb-1">{t('account.signedInAs')}</p>
          <p className="text-sm text-primary m-0 mb-3 break-all">{user.email}</p>
          <p className="text-xs text-muted m-0 mb-3">
            {syncing
              ? `⏳ ${t('account.syncing')}`
              : error
                ? <span className="text-danger">⚠ {t(`account.err.${error}`)}</span>
                : lastSync
                  ? `✓ ${t('account.lastSync', { time: new Date(lastSync).toLocaleString(locale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) })}`
                  : t('account.notSynced')}
          </p>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <button onClick={() => syncNow()} disabled={syncing} className="btn btn-primary text-xs disabled:opacity-50">
              🔄 {t('account.syncNow')}
            </button>
            <button onClick={() => run(signOut)} disabled={busy} className="btn btn-secondary text-xs">
              {t('account.signOut')}
            </button>
          </div>
          <button onClick={handleDeleteCloud} disabled={busy} className="text-xs text-muted underline bg-transparent border-0 p-0">
            {t('account.deleteCloud')}
          </button>
        </>
      ) : (
        <>
          <p className="text-xs text-secondary mb-3 leading-relaxed">{t('account.hint')}</p>

          <button onClick={() => run(signInWithGoogle)} disabled={busy} className="btn btn-secondary w-full mb-3">
            <span className="font-medium">G</span>&nbsp; {t('account.google')}
          </button>

          <form onSubmit={handleSubmit} className="space-y-2">
            <input
              type="email"
              className="input"
              placeholder={t('account.email')}
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              className="input"
              placeholder={t('account.password')}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="submit" disabled={busy} className="btn btn-primary w-full disabled:opacity-50">
              {busy ? '⏳' : mode === 'signin' ? t('account.signIn') : t('account.signUp')}
            </button>
          </form>

          <div className="flex justify-between mt-2">
            <button
              type="button"
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMessage(null); }}
              className="text-xs text-accent bg-transparent border-0 p-0"
            >
              {mode === 'signin' ? t('account.toSignUp') : t('account.toSignIn')}
            </button>
            {mode === 'signin' && (
              <button type="button" onClick={handleReset} className="text-xs text-muted bg-transparent border-0 p-0">
                {t('account.forgot')}
              </button>
            )}
          </div>
        </>
      )}

      {message && (
        <p className={`text-xs mt-3 m-0 ${message.kind === 'err' ? 'text-danger' : 'text-accent'}`}>{message.text}</p>
      )}
    </div>
  );
}
