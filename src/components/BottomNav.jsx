import { NavLink } from 'react-router-dom';
import { useT } from '../lib/i18n.js';

export default function BottomNav() {
  const t = useT();

  const items = [
    {
      to: '/',
      label: t('nav.home'),
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12l9-9 9 9" />
          <path d="M5 10v10h14V10" />
        </svg>
      )
    },
    {
      to: '/plants',
      label: t('nav.plants'),
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19.5 2c1 5 .45 10-3.5 14-1.8 1.8-4 3-5 3-.8 0-1.17-1.17-1.17-2" />
          <path d="M2 21c0-3 1.85-5.36 5.08-6" />
        </svg>
      )
    },
    {
      to: '/scanner',
      label: t('nav.scanner'),
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      )
    },
    {
      to: '/encyclopedia',
      label: t('nav.encyclopedia'),
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      )
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      <div className="max-w-md mx-auto px-4 pb-4 pointer-events-auto">
        <div className="bg-surface border border-strong rounded-xl px-2 py-3 flex justify-around items-center">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.to === '/'}
              className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}
            >
              {it.icon}
              <span>{it.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
