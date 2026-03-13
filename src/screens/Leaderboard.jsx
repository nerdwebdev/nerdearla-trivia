import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const TECH_AVATARS = [
  '⚛️', '🐍', '🦀', '☕', '🐹', '💎', '🐘', '🦕', '🔷', '🐳',
  '☸️', '🔥', '🧊', '⚡', '🦊', '🐧', '🤖', '🧬', '🔐', '🛠️',
  '📦', '🌐', '🎯', '💻', '🖥️', '⌨️', '🔌', '📡', '🧪', '🚀',
];

function getTechAvatar(playerId) {
  let hash = 0;
  for (let i = 0; i < playerId.length; i++) {
    hash = ((hash << 5) - hash) + playerId.charCodeAt(i);
    hash |= 0;
  }
  return TECH_AVATARS[Math.abs(hash) % TECH_AVATARS.length];
}

export default function Leaderboard({ session }) {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
    const channel = supabase
      .channel('leaderboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_sessions' }, () => {
        loadLeaderboard();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadLeaderboard = async () => {
    const { data } = await supabase
      .from('game_sessions')
      .select('score, correct_answers, finished_at, player_id, players(display_name, avatar_url)')
      .not('finished_at', 'is', null)
      .order('score', { ascending: false })
      .limit(50);

    setEntries(data || []);
    setLoading(false);
  };

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="screen fade-in" style={{ justifyContent: 'flex-start', paddingTop: 16, gap: 16 }}>
      <h2 style={{ fontSize: '1.8rem', color: 'var(--yellow)' }}>🏆 Clasificación</h2>

      {loading ? (
        <div style={{ color: 'var(--muted)' }}>Cargando...</div>
      ) : entries.length === 0 ? (
        <div style={{ color: 'var(--muted)', textAlign: 'center' }}>
          Nadie ha jugado todavía. ¡Sé el primero!
        </div>
      ) : (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {entries.map((e, i) => {
            const isMe = session?.user?.id === e.player_id;
            return (
              <div key={i} className="card" style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                border: isMe ? '1px solid var(--teal)' : 'none',
              }}>
                <span style={{ fontSize: i < 3 ? '1.5rem' : '1rem', width: 36, textAlign: 'center', flexShrink: 0 }}>
                  {i < 3 ? medals[i] : `#${i + 1}`}
                </span>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'var(--card)', border: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.2rem', flexShrink: 0,
                }}>
                  {getTechAvatar(e.player_id)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.players?.display_name || 'Jugador'}
                    {isMe && <span style={{ color: 'var(--teal)', fontSize: '0.8rem' }}> (tú)</span>}
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
                    {e.correct_answers}/15 correctas
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: 'var(--yellow)', fontSize: '1.1rem', fontFamily: "'Rift Soft', 'Arial Black', sans-serif" }}>
                  {e.score}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, width: '100%' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/')} style={{ flex: 1 }}>
          ← Volver
        </button>
        {!session && (
          <button className="btn btn-primary" onClick={() => navigate('/auth')} style={{ flex: 1 }}>
            Jugar
          </button>
        )}
      </div>
    </div>
  );
}
