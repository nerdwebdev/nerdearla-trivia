import { useNavigate } from 'react-router-dom';

export default function Landing({ session }) {
  const navigate = useNavigate();

  return (
    <div className="screen fade-in">
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 8 }}>🧠</div>
        <h1 style={{ fontSize: '2.5rem', lineHeight: 1.1, marginBottom: 8 }}>
          <span style={{ color: 'var(--red)' }}>Nerdearla</span><br />
          <span style={{ color: 'var(--yellow)' }}>Trivia</span>
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '1rem' }}>
          ¿Cuánto sabes de JavaScript y Nerdearla?
        </p>
      </div>

      <button
        className="btn btn-primary"
        onClick={() => navigate(session ? '/lobby' : '/auth')}
      >
        🎮 Jugar
      </button>

      <button
        className="btn btn-secondary"
        onClick={() => navigate('/leaderboard')}
      >
        🏆 Clasificación
      </button>
    </div>
  );
}
