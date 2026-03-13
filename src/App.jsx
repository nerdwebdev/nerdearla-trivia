import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Landing from './screens/Landing';
import Auth from './screens/Auth';
import Lobby from './screens/Lobby';
import Game from './screens/Game';
import Results from './screens/Results';
import Leaderboard from './screens/Leaderboard';
import LeaderboardMonitor from './screens/LeaderboardMonitor';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div className="screen"><div style={{ color: 'var(--muted)' }}>Loading...</div></div>;

  return (
    <BrowserRouter basename="/trivia">
      <Routes>
        <Route path="/" element={<Landing session={session} />} />
        <Route path="/auth" element={<Auth session={session} />} />
        <Route path="/lobby" element={<Lobby session={session} />} />
        <Route path="/game" element={<Game session={session} />} />
        <Route path="/results" element={<Results session={session} />} />
        <Route path="/leaderboard" element={<Leaderboard session={session} />} />
        <Route path="/monitor" element={<LeaderboardMonitor />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
