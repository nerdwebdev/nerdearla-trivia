# Nerdearla Trivia 🧠

Mobile-first trivia game for the Nerdearla booth. Players scan a QR code, sign in, answer 15 questions about JavaScript and Nerdearla, and compete on a real-time leaderboard.

## Setup

### 1. Supabase
1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in the SQL Editor (creates tables, RLS policies, and seeds 15 questions)
3. Enable Google OAuth in Authentication → Providers → Google
4. Add your domain to Authentication → URL Configuration → Redirect URLs: `https://nerdearla.com/trivia/lobby`

### 2. Environment
```bash
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

### 3. Run
```bash
npm install
npm run dev
```

### 4. Deploy
```bash
npm run build
# Serve dist/ behind a reverse proxy at /trivia/
```

## Routes
| Route | Description |
|-------|-------------|
| `/trivia/` | Landing page |
| `/trivia/auth` | Sign in |
| `/trivia/lobby` | Rules & start |
| `/trivia/game` | Play |
| `/trivia/results` | Your score |
| `/trivia/leaderboard` | Player leaderboard |
| `/trivia/monitor` | Booth monitor (full-screen, auto-updating) |

## Scoring
- Correct answer: 100 base points
- Speed bonus: up to +100 points (linear, faster = more)
- Max possible: 3000 points (15 × 200)

## Tech
React (Vite) + Supabase (Auth, Postgres, Realtime)
