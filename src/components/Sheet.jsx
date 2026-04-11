import { useEffect } from 'react';

export default function Sheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={onClose} />

      <div
        className="relative w-full max-w-md border-t sm:border sm:rounded-xl rounded-t-2xl max-h-[90vh] flex flex-col animate-slideUp"
        style={{ backgroundColor: 'var(--bg-app)', borderColor: 'var(--border-strong)' }}
      >
        <div className="flex justify-center pt-2 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-elevated" />
        </div>

        {title && (
          <div className="flex items-center justify-between px-5 py-3 border-b border-soft">
            <h3 className="text-base text-primary m-0">{title}</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted"
              aria-label="Zamknij"
            >
              ✕
            </button>
          </div>
        )}

        <div className="overflow-y-auto px-5 py-4 flex-1">{children}</div>
      </div>
    </div>
  );
}
