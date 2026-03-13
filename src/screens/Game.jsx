import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const TIMER_SECONDS = 15;
const TOTAL_QUESTIONS = 15;

export default function Game({ session }) {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState(null); // { correct, correctOption }
  const [sessionId, setSessionId] = useState(null);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const startTimeRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!session) { navigate('/auth'); return; }
    initGame();
  }, [session]);

  const initGame = async () => {
    // Fetch questions (random 15)
    const { data: qs, error } = await supabase
      .from('questions')
      .select('*')
      .limit(TOTAL_QUESTIONS);

    if (error || !qs?.length) {
      console.error('Failed to load questions:', error);
      setLoading(false);
      return;
    }

    // Shuffle
    const shuffled = qs.sort(() => Math.random() - 0.5).slice(0, TOTAL_QUESTIONS);
    setQuestions(shuffled);

    // Create game session (or fetch existing unfinished one)
    let gs;
    const { data: existing } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('player_id', session.user.id)
      .maybeSingle();

    if (existing?.finished_at) {
      navigate('/lobby');
      return;
    } else if (existing) {
      gs = existing;
    } else {
      const { data: newGs, error: gsErr } = await supabase
        .from('game_sessions')
        .insert({ player_id: session.user.id, total_questions: shuffled.length })
        .select()
        .single();

      if (gsErr) {
        console.error('Session error:', gsErr);
        navigate('/lobby');
        return;
      }
      gs = newGs;
    }

    setSessionId(gs.id);
    setLoading(false);
    startTimeRef.current = Date.now();
  };

  // Timer
  useEffect(() => {
    if (loading || feedback || !questions.length) return;
    startTimeRef.current = Date.now();
    setTimeLeft(TIMER_SECONDS);

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [currentIdx, loading, questions.length]);

  const handleTimeout = useCallback(() => {
    if (feedback) return;
    submitAnswer(null);
  }, [currentIdx, sessionId, questions]);

  const submitAnswer = async (option) => {
    if (feedback) return;
    clearInterval(timerRef.current);

    const q = questions[currentIdx];
    const timeTaken = Date.now() - startTimeRef.current;
    const isCorrect = option === q.correct_option;
    let points = 0;

    if (isCorrect && timeTaken <= 16000) {
      const speedBonus = Math.round(Math.max(0, (1 - timeTaken / 15000)) * 100);
      points = 100 + speedBonus;
    }

    setFeedback({ correct: isCorrect, correctOption: q.correct_option });
    setSelected(option);

    if (isCorrect) {
      setScore(s => s + points);
      setCorrectCount(c => c + 1);
    }

    // Save answer
    await supabase.from('answers').insert({
      session_id: sessionId,
      question_id: q.id,
      selected_option: option,
      is_correct: isCorrect,
      time_taken_ms: timeTaken,
      points,
    });

    // Update session score
    const newScore = score + points;
    const newCorrect = correctCount + (isCorrect ? 1 : 0);
    await supabase.from('game_sessions').update({
      score: newScore,
      correct_answers: newCorrect,
      ...(currentIdx === questions.length - 1 ? { finished_at: new Date().toISOString() } : {})
    }).eq('id', sessionId);

    // Auto advance after 1.2s
    setTimeout(() => {
      if (currentIdx < questions.length - 1) {
        setCurrentIdx(i => i + 1);
        setFeedback(null);
        setSelected(null);
      } else {
        navigate('/results');
      }
    }, 1200);
  };

  if (loading) {
    return <div className="screen"><div style={{ color: 'var(--muted)' }}>Cargando preguntas...</div></div>;
  }

  if (!questions.length) {
    return <div className="screen"><p style={{ color: 'var(--red)' }}>No hay preguntas disponibles. Verifica la configuración de Supabase.</p></div>;
  }

  const q = questions[currentIdx];
  const options = [
    { key: 'A', text: q.option_a },
    { key: 'B', text: q.option_b },
    { key: 'C', text: q.option_c },
    { key: 'D', text: q.option_d },
  ];

  const timerColor = timeLeft <= 5 ? 'var(--red)' : timeLeft <= 10 ? 'var(--yellow)' : 'var(--teal)';

  return (
    <div className="screen fade-in" style={{ justifyContent: 'flex-start', paddingTop: 16, gap: 16 }}>
      {/* Progress */}
      <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ color: 'var(--muted)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
          {currentIdx + 1}/{questions.length}
        </span>
        <div className="progress-bar" style={{ flex: 1 }}>
          <div className="progress-bar-fill" style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }} />
        </div>
        <span style={{ color: 'var(--yellow)', fontSize: '0.85rem' }}>⚡{score}</span>
      </div>

      {/* Timer */}
      <div className="timer-ring" style={{ border: `3px solid ${timerColor}`, color: timerColor }}>
        {timeLeft}
      </div>

      {/* Question */}
      <div className="card" style={{ width: '100%', textAlign: 'center' }}>
        <span style={{ color: 'var(--teal)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>
          {q.category} • {q.difficulty}
        </span>
        <p style={{ fontSize: '1.1rem', lineHeight: 1.4 }}>{q.question}</p>
      </div>

      {/* Options */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {options.map(opt => {
          let bg = 'var(--card)';
          let border = '1px solid transparent';
          if (feedback) {
            if (opt.key === q.correct_option) {
              bg = 'var(--teal)';
            } else if (opt.key === selected && !feedback.correct) {
              bg = 'var(--red)';
            }
          }

          return (
            <button
              key={opt.key}
              onClick={() => submitAnswer(opt.key)}
              disabled={!!feedback}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', borderRadius: 'var(--radius)',
                background: bg, border, color: 'var(--white)',
                fontSize: '1rem', cursor: feedback ? 'default' : 'pointer',
                transition: 'background 0.2s', textAlign: 'left',
              }}
            >
              <span style={{
                width: 32, height: 32, borderRadius: 8,
                background: feedback ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '0.9rem', flexShrink: 0,
              }}>
                {opt.key}
              </span>
              <span>{opt.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
