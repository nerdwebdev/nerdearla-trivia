-- Security fix round 2: Block deletes, restrict anon access, hide emails

-- Block all DELETE operations
CREATE POLICY "No deletes on game_sessions" ON game_sessions FOR DELETE USING (false);
CREATE POLICY "No deletes on players" ON players FOR DELETE USING (false);
CREATE POLICY "No deletes on answers" ON answers FOR DELETE USING (false);

-- Players only viewable by authenticated (protects emails)
DROP POLICY IF EXISTS "Players are viewable by everyone" ON players;
DROP POLICY IF EXISTS "Players public view" ON players;
CREATE POLICY "Players viewable by authenticated only" ON players FOR SELECT USING (auth.role() = 'authenticated');

-- Update own player only
DROP POLICY IF EXISTS "Users can update own player" ON players;
CREATE POLICY "Users can update own player" ON players FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Block anon from questions_safe
REVOKE SELECT ON questions_safe FROM anon;

-- Block anon from submit_answer
REVOKE EXECUTE ON FUNCTION submit_answer FROM anon;
REVOKE EXECUTE ON FUNCTION submit_answer FROM public;
GRANT EXECUTE ON FUNCTION submit_answer TO authenticated;

-- Public leaderboard view (no emails)
CREATE OR REPLACE VIEW players_public AS
SELECT id, display_name, avatar_url FROM players;
GRANT SELECT ON players_public TO anon;
GRANT SELECT ON players_public TO authenticated;
