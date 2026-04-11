import { useState, useEffect, useRef } from 'react';
import { useSettingsStore } from '../store/useSettingsStore.js';
import { useAppStore } from '../store/useAppStore.js';
import { isValidApiKeyFormat } from '../lib/gemini.js';
import { useT, SUPPORTED_LANGUAGES } from '../lib/i18n.js';
import {
  isSupported as notifSupported,
  getPermission,
  requestPermission,
  notify
} from '../lib/notifications.js';
import { downloadBackup, readBackupFile, applyBackup } from '../lib/backup.js';

export default function SettingsPage() {
  const t = useT();

  // === Stores ===
  const apiKey = useSettingsStore((s) => s.apiKey);
  const setApiKey = useSettingsStore((s) => s.setApiKey);
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const notifEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const setNotifEnabled = useSettingsStore((s) => s.setNotificationsEnabled);
  const scanHistory = useSettingsStore((s) => s.scanHistory);
  const clearScanHistory = useSettingsStore((s) => s.clearScanHistory);
  const hydrateApp = useAppStore((s) => s.hydrate);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);

  // === Local UI state ===
  const [draft, setDraft] = useState(apiKey);
  const [reveal, setReveal] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [notifPerm, setNotifPerm] = useState(getPermission());
  const importRef = useRef(null);

  useEffect(() => setDraft(apiKey), [apiKey]);

  // === API Key ===
  const handleSave = () => {
    setApiKey(draft.trim());
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };
  const handleClear = () => { setApiKey(''); setDraft(''); };
  const isValid = !draft || isValidApiKeyFormat(draft);

  // === Notifications ===
  const handleEnableNotifs = async () => {
    if (!notifSupported()) return;
    const result = await requestPermission();
    setNotifPerm(result);
    if (result === 'granted') {
      setNotifEnabled(true);
      notify('🌿 PlantCare', 'Powiadomienia włączone. Będziemy przypominać o podlewaniu.');
    } else {
      setNotifEnabled(false);
    }
  };
  const handleDisableNotifs = () => setNotifEnabled(false);
  const handleTestNotif = () => {
    notify('🌿 PlantCare', 'To jest testowe powiadomienie. Wszystko działa.');
  };

  // === Backup ===
  const handleExport = async () => {
    try { await downloadBackup(); }
    catch (e) { alert('Błąd eksportu: ' + e.message); }
  };
  const handleImportClick = () => importRef.current?.click();
  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const backup = await readBackupFile(file);
      const ok = window.confirm(t('settings.importConfirm'));
      if (!ok) return;
      await applyBackup(backup);
      // Przeładuj store ze świeżych danych
      await hydrateApp();
      await hydrateSettings();
      alert(t('settings.importSuccess'));
    } catch (err) {
      alert('Błąd importu: ' + err.message);
    }
  };

  return (
    <div className="px-5 pt-6">
      <h1 className="text-2xl text-primary mb-4">{t('settings.title')}</h1>

      {/* === Klucz API Gemini === */}
      <div className="card mb-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm text-primary font-medium m-0">🔑 {t('settings.apiKey')}</h2>
          {apiKey && <span className="text-xs text-accent">● {t('settings.apiKeyActive')}</span>}
        </div>
        <p className="text-xs text-secondary mb-3">
          Pobierz darmowy klucz z{' '}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-accent underline">
            Google AI Studio
          </a>.
        </p>
        <div className="relative mb-2">
          <input
            type={reveal ? 'text' : 'password'}
            className="input pr-12"
            placeholder="AIza..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoComplete="off"
            spellCheck="false"
          />
          <button onClick={() => setReveal((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">
            {reveal ? 'ukryj' : 'pokaż'}
          </button>
        </div>
        {!isValid && <p className="text-xs text-danger mb-2">{t('settings.apiKeyInvalid')}</p>}
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={!isValid || draft === apiKey} className="btn btn-primary flex-1 disabled:opacity-50">
            {savedFlash ? `✓ ${t('common.saved')}` : `💾 ${t('common.save')}`}
          </button>
          {apiKey && <button onClick={handleClear} className="btn btn-secondary">{t('common.delete')}</button>}
        </div>
        <p className="text-xs text-muted mt-3">{t('settings.apiKeyLocal')}</p>
      </div>

      {/* === Motyw === */}
      <div className="card mb-3">
        <h2 className="text-sm text-primary font-medium m-0 mb-3">🎨 {t('settings.theme')}</h2>
        <div className="grid grid-cols-2 gap-2">
          <ThemeOption
            active={theme === 'dark'}
            onClick={() => setTheme('dark')}
            label={t('settings.themeDark')}
            preview="#0b2218"
            accent="#7dd66f"
          />
          <ThemeOption
            active={theme === 'light'}
            onClick={() => setTheme('light')}
            label={t('settings.themeLight')}
            preview="#f6f1e4"
            accent="#46a23a"
          />
        </div>
      </div>

      {/* === Język === */}
      <div className="card mb-3">
        <h2 className="text-sm text-primary font-medium m-0 mb-3">🌍 {t('settings.language')}</h2>
        <div className="grid grid-cols-3 gap-2">
          {SUPPORTED_LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => setLanguage(l.code)}
              className={`pill flex-col py-3 text-center ${language === l.code ? 'pill-on' : ''}`}
            >
              <span className="text-xl block mb-1">{l.flag}</span>
              <span className="text-xs">{l.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* === Powiadomienia === */}
      <div className="card mb-3">
        <h2 className="text-sm text-primary font-medium m-0 mb-2">🔔 {t('settings.notifications')}</h2>
        {!notifSupported() ? (
          <p className="text-xs text-muted m-0">Twoja przeglądarka nie wspiera powiadomień.</p>
        ) : notifPerm === 'denied' ? (
          <p className="text-xs text-danger m-0">{t('settings.notificationsDenied')}</p>
        ) : notifEnabled && notifPerm === 'granted' ? (
          <>
            <p className="text-xs text-accent mb-3">● {t('settings.notificationsEnabled')}</p>
            <div className="flex gap-2">
              <button onClick={handleTestNotif} className="btn btn-secondary flex-1 text-xs">
                {t('settings.notificationsTest')}
              </button>
              <button onClick={handleDisableNotifs} className="btn btn-secondary flex-1 text-xs">
                Wyłącz
              </button>
            </div>
          </>
        ) : (
          <button onClick={handleEnableNotifs} className="btn btn-primary w-full">
            {t('settings.notificationsEnable')}
          </button>
        )}
      </div>

      {/* === Backup === */}
      <div className="card mb-3">
        <h2 className="text-sm text-primary font-medium m-0 mb-2">💾 {t('settings.backup')}</h2>
        <p className="text-xs text-secondary mb-3 leading-relaxed">{t('settings.backupHint')}</p>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={handleExport} className="btn btn-secondary text-xs">
            📤 {t('settings.exportJson')}
          </button>
          <button onClick={handleImportClick} className="btn btn-secondary text-xs">
            📥 {t('settings.importJson')}
          </button>
        </div>
        <input
          ref={importRef}
          type="file"
          accept="application/json,.json"
          onChange={handleImportFile}
          className="hidden"
        />
      </div>

      {/* === Historia skanów === */}
      {scanHistory.length > 0 && (
        <div className="card mb-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm text-primary font-medium m-0">📜 {t('settings.scanHistory')}</h2>
            <span className="text-xs text-muted">{scanHistory.length}</span>
          </div>
          <button onClick={clearScanHistory} className="btn btn-secondary w-full text-xs">
            {t('settings.clearHistory')}
          </button>
        </div>
      )}
    </div>
  );
}

function ThemeOption({ active, onClick, label, preview, accent }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md p-3 border-2 transition-all ${active ? 'border-strong' : 'border-soft'}`}
      style={{ borderColor: active ? accent : undefined }}
    >
      <div
        className="h-12 rounded mb-2 flex items-end justify-end p-1"
        style={{ backgroundColor: preview }}
      >
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: accent }} />
      </div>
      <p className="text-xs text-primary m-0">{label}</p>
    </button>
  );
}
