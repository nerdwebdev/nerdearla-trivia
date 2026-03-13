import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Lobby({ session }) {
  const navigate = useNavigate();
  const [hasPlayed, setHasPlayed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) { navigate('/auth'); return; }
    checkExistingSession();
  }, [session]);

  const checkExistingSession = async () => {
    const user = session.user;
    await supabase.from('players').upsert({
      id: user.id,
      display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Jugador',
      email: user.email,
      avatar_url: user.user_metadata?.avatar_url || null,
    }, { onConflict: 'id' });

    const { data } = await supabase
      .from('game_sessions')
      .select('id, finished_at, score')
      .eq('player_id', user.id)
      .maybeSingle();

    if (data?.finished_at) {
      setHasPlayed(true);
    }
    setLoading(false);
  };

  if (loading) return <div className="screen"><div style={{ color: 'var(--muted)' }}>Cargando...</div></div>;

  if (hasPlayed) {
    return (
      <div className="screen fade-in">
        <h2>¡Ya jugaste! 🎉</h2>
        <p style={{ color: 'var(--muted)', textAlign: 'center' }}>
          Solo se permite un intento por persona.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/results')}>
          Ver mis resultados
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/leaderboard')}>
          🏆 Clasificación
        </button>
      </div>
    );
  }

  return (
    <div className="screen fade-in">
      <h2 style={{ fontSize: '1.8rem', color: 'var(--yellow)' }}>Reglas</h2>

      <div className="card" style={{ width: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Rule icon="📝" text="20 preguntas sobre JavaScript y Nerdearla" />
          <Rule icon="⏱️" text="15 segundos por pregunta" />
          <Rule icon="⚡" text="Más rápido = más puntos" />
          <Rule icon="🏆" text="¡Los 3 primeros ganan premios!" />
          <Rule icon="⚠️" text="Solo 1 intento — ¡que cuente!" />
        </div>
      </div>

      <button className="btn btn-primary" onClick={() => navigate('/game')}>
        🚀 Comenzar
      </button>

      <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
        ← Volver
      </button>
    </div>
  );
}

function Rule({ icon, text }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <span style={{ fontSize: '1.3rem' }}>{icon}</span>
      <span style={{ fontSize: '0.95rem' }}>{text}</span>
    </div>
  );
}
