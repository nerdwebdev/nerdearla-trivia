import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Results({ session }) {
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [rank, setRank] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) { navigate('/auth'); return; }
    loadResults();
  }, [session]);

  const loadResults = async () => {
    const { data: gs } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('player_id', session.user.id)
      .maybeSingle();

    if (!gs) { navigate('/lobby'); return; }
    setResult(gs);

    const { data: all } = await supabase
      .from('game_sessions')
      .select('player_id, score')
      .not('finished_at', 'is', null)
      .order('score', { ascending: false });

    if (all) {
      const idx = all.findIndex(r => r.player_id === session.user.id);
      setRank(idx + 1);
    }
    setLoading(false);
  };

  if (loading) return <div className="screen"><div style={{ color: 'var(--muted)' }}>Cargando...</div></div>;
  if (!result) return null;

  const isTop3 = rank && rank <= 3;
  const medals = ['🥇', '🥈', '🥉'];
  const maxScore = result.total_questions * 200;

  return (
    <div className="screen fade-in">
      {isTop3 && <Confetti />}

      <div style={{ textAlign: 'center' }}>
        {isTop3 ? (
          <div style={{ fontSize: '4rem' }}>{medals[rank - 1]}</div>
        ) : (
          <div style={{ fontSize: '3rem' }}>🎮</div>
        )}
        <h2 style={{ fontSize: '2rem', marginTop: 8 }}>
          {isTop3 ? '¡Felicidades!' : '¡Fin del juego!'}
        </h2>
      </div>

      <div className="card" style={{ width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--yellow)', fontFamily: "'Rift Soft', 'Arial Black', sans-serif" }}>
          {result.score}
        </div>
        <div style={{ color: 'var(--muted)', marginBottom: 16 }}>puntos</div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 32 }}>
          <Stat label="Correctas" value={`${result.correct_answers}/${result.total_questions}`} />
          <Stat label="Precisión" value={`${Math.round((result.correct_answers / result.total_questions) * 100)}%`} />
          <Stat label="Posición" value={rank ? `#${rank}` : '-'} />
        </div>
      </div>

      {isTop3 && (
        <div className="card" style={{ width: '100%', textAlign: 'center', border: '1px solid var(--yellow)' }}>
          <p style={{ color: 'var(--yellow)', fontWeight: 700 }}>
            🏆 ¡Estás en el Top 3! Acércate al stand de Nerdearla al finalizar el evento para pedir tu premio.
          </p>
        </div>
      )}

      <button className="btn btn-primary" onClick={() => navigate('/leaderboard')}>
        🏆 Ver clasificación
      </button>

      <button className="btn btn-secondary" onClick={() => navigate('/')}>
        ← Volver al inicio
      </button>

      <a
        href="https://discord.gg/nerdearla"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          color: 'var(--teal)', fontSize: '0.95rem', textDecoration: 'none', marginTop: 8,
        }}
      >
        💬 Únete a nuestra comunidad en Discord
      </a>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{label}</div>
    </div>
  );
}

function Confetti() {
  const colors = ['#FF323C', '#FFBA00', '#00ACA8', '#FFFFFF'];
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 50 }}>
      {Array.from({ length: 30 }).map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${Math.random() * 100}%`,
          top: -20,
          width: 10, height: 10,
          background: colors[i % colors.length],
          borderRadius: i % 2 ? '50%' : 0,
          animation: `confetti-fall ${2 + Math.random() * 2}s linear ${Math.random() * 2}s`,
          animationFillMode: 'forwards',
        }} />
      ))}
    </div>
  );
}
