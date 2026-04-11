import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store/useAppStore.js';
import { useSettingsStore } from './store/useSettingsStore.js';
import { useTheme } from './hooks/useTheme.js';
import { useWateringReminders } from './hooks/useWateringReminders.js';
import BottomNav from './components/BottomNav.jsx';
import HomePage from './pages/HomePage.jsx';
import MyPlantsPage from './pages/MyPlantsPage.jsx';
import PlantDetailPage from './pages/PlantDetailPage.jsx';
import ScannerPage from './pages/ScannerPage.jsx';
import EncyclopediaPage from './pages/EncyclopediaPage.jsx';
import EncyclopediaDetailPage from './pages/EncyclopediaDetailPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import StatsPage from './pages/StatsPage.jsx';
import DiagnosePage from './pages/DiagnosePage.jsx';
import CalendarPage from './pages/CalendarPage.jsx';
import QuizPage from './pages/QuizPage.jsx';
import ChatPage from './pages/ChatPage.jsx';

export default function App() {
  const hydrateApp = useAppStore((s) => s.hydrate);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const appLoaded = useAppStore((s) => s.loaded);
  const settingsLoaded = useSettingsStore((s) => s.loaded);

  useEffect(() => {
    hydrateApp();
    hydrateSettings();
  }, [hydrateApp, hydrateSettings]);

  // Synchronizuj motyw z DOM (klasa html.light)
  useTheme();

  // Wystartuj reminder podlewania (no-op jeśli wyłączone)
  useWateringReminders();

  if (!appLoaded || !settingsLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted text-sm">Wczytywanie…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto">
      <main className="flex-1 pb-24">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/plants" element={<MyPlantsPage />} />
          <Route path="/plants/:id" element={<PlantDetailPage />} />
          <Route path="/scanner" element={<ScannerPage />} />
          <Route path="/encyclopedia" element={<EncyclopediaPage />} />
          <Route path="/encyclopedia/:id" element={<EncyclopediaDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/diagnose" element={<DiagnosePage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
}
