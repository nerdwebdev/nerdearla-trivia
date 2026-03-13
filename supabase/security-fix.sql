-- SECURITY FIXES: Server-side score validation

-- 1. Remove direct UPDATE on game_sessions (prevent score tampering)
DROP POLICY IF EXISTS "Users can update own session" ON game_sessions;

-- 2. Remove direct INSERT on answers (force validation through function)
DROP POLICY IF EXISTS "Users can insert own answers" ON answers;

-- 3. Create a server-side function to submit answers with validation
CREATE OR REPLACE FUNCTION submit_answer(
  p_session_id uuid,
  p_question_id integer,
  p_selected_option char(1),
  p_time_taken_ms integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_player_id uuid;
  v_correct_option char(1);
  v_is_correct boolean;
  v_points integer := 0;
  v_session_finished timestamptz;
  v_already_answered boolean;
  v_current_score integer;
  v_current_correct integer;
  v_total_questions integer;
  v_new_correct integer;
BEGIN
  -- Verify session belongs to current user
  SELECT player_id, finished_at, score, correct_answers, total_questions
  INTO v_player_id, v_session_finished, v_current_score, v_current_correct, v_total_questions
  FROM game_sessions WHERE id = p_session_id;

  IF v_player_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Session not found');
  END IF;

  IF v_player_id != auth.uid() THEN
    RETURN jsonb_build_object('error', 'Not your session');
  END IF;

  IF v_session_finished IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'Game already finished');
  END IF;

  -- Check if already answered this question
  SELECT EXISTS(
    SELECT 1 FROM answers WHERE session_id = p_session_id AND question_id = p_question_id
  ) INTO v_already_answered;

  IF v_already_answered THEN
    RETURN jsonb_build_object('error', 'Already answered');
  END IF;

  -- Get correct answer from DB (server-side validation!)
  SELECT correct_option INTO v_correct_option FROM questions WHERE id = p_question_id;

  IF v_correct_option IS NULL THEN
    RETURN jsonb_build_object('error', 'Question not found');
  END IF;

  -- Validate answer
  v_is_correct := (p_selected_option = v_correct_option);

  -- Calculate points server-side
  IF v_is_correct AND p_time_taken_ms >= 0 AND p_time_taken_ms <= 16000 THEN
    v_points := 100 + GREATEST(0, ROUND((1.0 - p_time_taken_ms::numeric / 15000.0) * 100)::integer);
  END IF;

  -- Clamp time to reasonable values
  IF p_time_taken_ms < 0 THEN
    v_points := 0;
  END IF;

  -- Insert answer
  INSERT INTO answers (session_id, question_id, selected_option, is_correct, time_taken_ms, points)
  VALUES (p_session_id, p_question_id, p_selected_option, v_is_correct, GREATEST(0, p_time_taken_ms), v_points);

  -- Update session score
  v_new_correct := v_current_correct + (CASE WHEN v_is_correct THEN 1 ELSE 0 END);

  -- Count answered questions to check if game is done
  UPDATE game_sessions SET
    score = v_current_score + v_points,
    correct_answers = v_new_correct,
    finished_at = CASE
      WHEN (SELECT COUNT(*) FROM answers WHERE session_id = p_session_id) >= v_total_questions
      THEN NOW()
      ELSE NULL
    END
  WHERE id = p_session_id;

  RETURN jsonb_build_object(
    'is_correct', v_is_correct,
    'correct_option', v_correct_option,
    'points', v_points,
    'finished', (SELECT finished_at IS NOT NULL FROM game_sessions WHERE id = p_session_id)
  );
END;
$$;

-- 4. Don't send correct_option to client — create a view without it
CREATE OR REPLACE VIEW questions_safe AS
SELECT id, question, option_a, option_b, option_c, option_d, category, difficulty, created_at
FROM questions;

-- 5. RLS on the view
ALTER VIEW questions_safe OWNER TO postgres;
GRANT SELECT ON questions_safe TO authenticated;

-- 6. Revoke direct access to questions table for anon/authenticated
REVOKE SELECT ON questions FROM anon;
REVOKE SELECT ON questions FROM authenticated;

-- 7. Allow authenticated to call the function
GRANT EXECUTE ON FUNCTION submit_answer TO authenticated;
