import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlantsDB } from '../lib/plantsI18n.js';
import { generateQuiz } from '../lib/quiz.js';
import PlantImage from '../components/PlantImage.jsx';
import { useT } from '../lib/i18n.js';

const QUIZ_LENGTH = 10;

export default function QuizPage() {
  const navigate = useNavigate();
  const t = useT();
  const plantsDB = usePlantsDB();
  const [quiz, setQuiz] = useState(() => generateQuiz(plantsDB, QUIZ_LENGTH));
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);

  // Pytania trzymają obiekty roślin — przy zmianie języka bierzemy bieżące tłumaczenie po id
  const loc = (p) => plantsDB.find((x) => x.id === p.id) || p;
  const current = quiz[currentIdx];
  const finished = currentIdx >= quiz.length;

  const handleAnswer = (index) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(index);
    if (index === current.correctIndex) {
      setScore(score + 1);
    }
  };

  const handleNext = () => {
    setSelectedAnswer(null);
    if (currentIdx + 1 >= quiz.length) {
      setShowResult(true);
    }
    setCurrentIdx(currentIdx + 1);
  };

  const handleRestart = () => {
    setQuiz(generateQuiz(plantsDB, QUIZ_LENGTH));
    setCurrentIdx(0);
    setScore(0);
    setSelectedAnswer(null);
    setShowResult(false);
  };

  // === EKRAN WYNIKU ===
  if (finished || showResult) {
    const pct = Math.round((score / quiz.length) * 100);
    let medal = '🌱';
    let label = t('quiz.r0');
    if (pct >= 90) { medal = '🏆'; label = t('quiz.r4'); }
    else if (pct >= 70) { medal = '🥇'; label = t('quiz.r3'); }
    else if (pct >= 50) { medal = '🥈'; label = t('quiz.r2'); }
    else if (pct >= 30) { medal = '🥉'; label = t('quiz.r1'); }

    return (
      <div className="px-5 pt-6">
        <Header navigate={navigate} title="Quiz" />

        <div className="card text-center py-10 mb-3">
          <div className="text-6xl mb-3">{medal}</div>
          <p className="font-serif text-xl text-primary m-0 mb-2">{label}</p>
          <p className="text-3xl text-accent font-medium m-0 mb-1">{score} / {quiz.length}</p>
          <p className="text-sm text-muted m-0">{t('quiz.percent', { n: pct })}</p>
        </div>

        <button onClick={handleRestart} className="btn btn-primary w-full mb-2">
          🔄 {t('quiz.again')}
        </button>
        <button onClick={() => navigate('/')} className="btn btn-secondary w-full">
          ← {t('quiz.home')}
        </button>
      </div>
    );
  }

  if (!current) return null;

  // === EKRAN PYTANIA ===
  const isAnswered = selectedAnswer !== null;
  const isCorrect = selectedAnswer === current.correctIndex;

  return (
    <div className="px-5 pt-6">
      <Header navigate={navigate} title="Quiz" />

      {/* Postęp */}
      <div className="card mb-3">
        <div className="flex items-center justify-between text-xs text-muted mb-2">
          <span>{t('quiz.progress', { i: currentIdx + 1, n: quiz.length })}</span>
          <span>{t('quiz.score', { n: score })}</span>
        </div>
        <div className="h-1.5 rounded-full bg-deep overflow-hidden">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${((currentIdx + (isAnswered ? 1 : 0)) / quiz.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Zdjęcie */}
      <div className="card mb-3 !p-0 overflow-hidden">
        <PlantImage
          src={current.plant.image}
          emoji={current.plant.emoji}
          alt={t('quiz.question')}
          className="w-full aspect-square"
          emojiSize="text-7xl"
        />
      </div>

      {/* Odpowiedzi */}
      <p className="text-sm text-muted text-center mb-3">{t('quiz.question')}</p>

      <div className="space-y-2 mb-3">
        {current.options.map((opt, i) => {
          const isCorrectAnswer = i === current.correctIndex;
          const isSelected = i === selectedAnswer;

          let style = 'bg-surface';
          if (isAnswered) {
            if (isCorrectAnswer) style = 'bg-accent';
            else if (isSelected) style = 'bg-danger';
            else style = 'bg-deep opacity-50';
          }

          return (
            <button
              key={opt.id}
              onClick={() => handleAnswer(i)}
              disabled={isAnswered}
              className={`w-full p-3 rounded-md text-left transition-colors ${style}`}
              style={
                isAnswered && isCorrectAnswer
                  ? { color: 'var(--accent-text)' }
                  : isAnswered && isSelected
                    ? { color: 'var(--accent-text)' }
                    : undefined
              }
            >
              <p className="font-serif text-base m-0">{loc(opt).name}</p>
              <p className="text-xs italic m-0 opacity-75">{opt.species}</p>
            </button>
          );
        })}
      </div>

      {/* Feedback + następne */}
      {isAnswered && (
        <>
          {isCorrect ? (
            <div className="card mb-3" style={{ borderLeftWidth: 4, borderLeftStyle: 'solid', borderLeftColor: 'var(--accent)' }}>
              <p className="text-sm text-accent font-medium m-0">✓ {t('quiz.correct')}</p>
            </div>
          ) : (
            <div className="card mb-3" style={{ borderLeftWidth: 4, borderLeftStyle: 'solid', borderLeftColor: 'var(--danger)' }}>
              <p className="text-sm text-danger font-medium m-0 mb-1">✗ Niestety</p>
              <p className="text-xs text-secondary m-0">{t('quiz.correctWas')} <strong>{loc(current.options[current.correctIndex]).name}</strong></p>
            </div>
          )}

          <button onClick={handleNext} className="btn btn-primary w-full">
            {currentIdx + 1 >= quiz.length ? `${t('quiz.finish')} →` : `${t('quiz.next')} →`}
          </button>
        </>
      )}
    </div>
  );
}

function Header({ navigate, title }) {
  const t = useT();
  return (
    <header className="flex items-center gap-3 mb-6">
      <button
        onClick={() => navigate(-1)}
        className="w-9 h-9 rounded-full bg-surface flex items-center justify-center"
        aria-label={t('common.back')}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </button>
      <h1 className="text-2xl text-primary m-0">{title}</h1>
    </header>
  );
}
