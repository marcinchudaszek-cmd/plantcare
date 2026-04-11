import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSettingsStore } from '../store/useSettingsStore.js';
import { useAppStore } from '../store/useAppStore.js';
import { chatGemini } from '../lib/gemini.js';

const SUGGESTED_QUESTIONS = [
  'Jaka roślina pasuje do łazienki bez okna?',
  'Dlaczego liście mojej Monstery żółkną?',
  'Czy mogę przesadzić rośliny zimą?',
  'Jak rozmnożyć Pothos?',
  'Co lubi paproć?',
  'Polec mi roślinę dla początkującego'
];

export default function ChatPage() {
  const navigate = useNavigate();
  const apiKey = useSettingsStore((s) => s.apiKey);
  const plants = useAppStore((s) => s.plants);

  const [messages, setMessages] = useState([]); // [{role, text}]
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const scrollRef = useRef(null);

  // Auto-scroll na dole przy nowych wiadomościach
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const newMessages = [...messages, { role: 'user', text: trimmed }];
    setMessages(newMessages);
    setInput('');
    setError(null);
    setLoading(true);

    try {
      const response = await chatGemini(apiKey, messages, trimmed, plants);
      setMessages([...newMessages, { role: 'model', text: response }]);
    } catch (e) {
      setError(e.message);
      setMessages(newMessages);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleSuggestion = (q) => {
    sendMessage(q);
  };

  const handleClear = () => {
    setMessages([]);
    setError(null);
  };

  if (!apiKey) {
    return (
      <div className="px-5 pt-6">
        <Header navigate={navigate} />
        <div className="card">
          <p className="text-sm text-primary m-0 mb-2">⚠️ Brak klucza API</p>
          <p className="text-xs text-muted m-0 mb-3">
            Aby porozmawiać z asystentem, dodaj darmowy klucz Gemini w ustawieniach.
          </p>
          <Link to="/settings" className="btn btn-primary w-full">
            Przejdź do ustawień
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen pt-6">
      <div className="px-5">
        <Header navigate={navigate} onClear={messages.length > 0 ? handleClear : null} />
      </div>

      {/* Lista wiadomości */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 pb-4">
        {messages.length === 0 ? (
          <div>
            <div className="card mb-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="text-3xl">💬</div>
                <div>
                  <p className="font-serif text-base text-primary m-0">Asystent ogrodniczy</p>
                  <p className="text-xs text-muted m-0">Zna Twoją kolekcję ({plants.length} {plants.length === 1 ? 'roślina' : 'roślin'})</p>
                </div>
              </div>
              <p className="text-xs text-secondary leading-relaxed m-0">
                Zapytaj o wszystko związane z roślinami doniczkowymi. Asystent ma wiedzę
                o Twoich roślinach, więc może doradzić w konkretnych sprawach.
              </p>
            </div>

            <p className="text-xs text-muted mb-2">Sugerowane pytania:</p>
            <div className="space-y-2">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestion(q)}
                  className="w-full text-left card hover:bg-deep transition-colors"
                >
                  <p className="text-sm text-primary m-0">{q}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}
            {loading && (
              <div className="flex">
                <div className="card max-w-[80%]" style={{ marginRight: 'auto' }}>
                  <p className="text-sm text-muted m-0">⏳ Asystent myśli…</p>
                </div>
              </div>
            )}
            {error && (
              <div className="card" style={{ borderLeftWidth: 4, borderLeftStyle: 'solid', borderLeftColor: 'var(--danger)' }}>
                <p className="text-xs text-danger m-0">{error}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-5 pb-24 pt-3 border-t border-soft bg-app">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Zapytaj o cokolwiek..."
            disabled={loading}
            className="flex-1 px-3 py-2 rounded-md bg-surface text-primary border border-soft text-sm disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="btn btn-primary disabled:opacity-50 px-4"
          >
            ↑
          </button>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] px-3 py-2 rounded-lg ${isUser ? 'bg-accent' : 'bg-surface'}`}
        style={isUser ? { color: 'var(--accent-text)' } : undefined}
      >
        <p className={`text-sm m-0 whitespace-pre-wrap ${isUser ? '' : 'text-primary'}`}>{msg.text}</p>
      </div>
    </div>
  );
}

function Header({ navigate, onClear }) {
  return (
    <header className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-surface flex items-center justify-center"
          aria-label="Wroc"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl text-primary m-0">Asystent</h1>
      </div>
      {onClear && (
        <button onClick={onClear} className="text-xs text-muted px-2 py-1">
          🗑 Wyczyść
        </button>
      )}
    </header>
  );
}
