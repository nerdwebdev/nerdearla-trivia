import { useState, useEffect } from 'react';
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

export default function LeaderboardMonitor() {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    loadLeaderboard();
    const channel = supabase
      .channel('monitor')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_sessions' }, () => {
        loadLeaderboard();
      })
      .subscribe();
    // Auto-refresh every 10s as backup
    const interval = setInterval(loadLeaderboard, 10000);
    return () => { supabase.removeChannel(channel); clearInterval(interval); };
  }, []);

  const loadLeaderboard = async () => {
    const { data } = await supabase
      .from('game_sessions')
      .select('score, correct_answers, finished_at, player_id, players(display_name, avatar_url)')
      .not('finished_at', 'is', null)
      .order('score', { ascending: false })
      .limit(20);
    setEntries(data || []);
  };

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div style={{
      background: '#000', color: '#fff', minHeight: '100vh', padding: '40px 60px',
      fontFamily: "'Roboto', sans-serif",
    }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{
          fontFamily: "'Rift Soft', 'Arial Black', sans-serif",
          fontSize: '3.5rem', textTransform: 'uppercase', letterSpacing: 2,
        }}>
          <span style={{ color: '#FF323C' }}>Nerdearla</span>{' '}
          <span style={{ color: '#FFBA00' }}>Trivia</span>{' '}
          <span style={{ color: '#00ACA8' }}>🏆</span>
        </h1>
      </div>

      {entries.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#929292', fontSize: '2rem', marginTop: 80 }}>
          Esperando jugadores...
        </div>
      ) : (
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {entries.map((e, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 20,
              background: i < 3 ? '#111' : '#0a0a0a',
              borderRadius: 16, padding: '16px 24px',
              border: i < 3 ? '1px solid #FFBA00' : 'none',
              fontSize: i < 3 ? '1.4rem' : '1.1rem',
            }}>
              <span style={{ fontSize: i < 3 ? '2.5rem' : '1.3rem', width: 60, textAlign: 'center' }}>
                {i < 3 ? medals[i] : `#${i + 1}`}
              </span>
              <div style={{
                width: i < 3 ? 48 : 36, height: i < 3 ? 48 : 36, borderRadius: '50%',
                background: '#111', border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: i < 3 ? '1.8rem' : '1.3rem',
              }}>
                {getTechAvatar(e.player_id)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{e.players?.display_name || 'Jugador'}</div>
                <div style={{ color: '#929292', fontSize: '0.8em' }}>{e.correct_answers}/20 correctas</div>
              </div>
              <div style={{
                fontWeight: 700, color: '#FFBA00', fontSize: i < 3 ? '2rem' : '1.3rem',
                fontFamily: "'Rift Soft', 'Arial Black', sans-serif",
              }}>
                {e.score}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
