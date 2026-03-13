-- Nerdearla Trivia - Database Schema
-- Run this in the Supabase SQL Editor

-- Players (extends Supabase auth.users)
create table players (
  id uuid primary key references auth.users(id),
  display_name text not null,
  email text not null,
  avatar_url text,
  created_at timestamptz default now()
);

-- Questions
create table questions (
  id serial primary key,
  question text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_option char(1) not null check (correct_option in ('A','B','C','D')),
  category text not null check (category in ('javascript', 'nerdearla')),
  difficulty text default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  created_at timestamptz default now()
);

-- Game sessions (one per player attempt)
create table game_sessions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references players(id) not null,
  score integer default 0,
  total_questions integer default 15,
  correct_answers integer default 0,
  started_at timestamptz default now(),
  finished_at timestamptz,
  unique(player_id)
);

-- Individual answers
create table answers (
  id serial primary key,
  session_id uuid references game_sessions(id) not null,
  question_id integer references questions(id) not null,
  selected_option char(1),
  is_correct boolean,
  time_taken_ms integer,
  points integer default 0,
  created_at timestamptz default now()
);

-- RLS Policies
alter table players enable row level security;
alter table questions enable row level security;
alter table game_sessions enable row level security;
alter table answers enable row level security;

-- Players: users can read all, insert/update own
create policy "Players are viewable by everyone" on players for select using (true);
create policy "Users can insert own player" on players for insert with check (auth.uid() = id);
create policy "Users can update own player" on players for update using (auth.uid() = id);

-- Questions: readable by all authenticated users
create policy "Questions are viewable by authenticated users" on questions for select using (auth.role() = 'authenticated');

-- Game sessions: readable by all, writable by own
create policy "Game sessions are viewable by everyone" on game_sessions for select using (true);
create policy "Users can insert own session" on game_sessions for insert with check (auth.uid() = player_id);
create policy "Users can update own session" on game_sessions for update using (auth.uid() = player_id);

-- Answers: users can manage own answers
create policy "Users can view own answers" on answers for select using (
  session_id in (select id from game_sessions where player_id = auth.uid())
);
create policy "Users can insert own answers" on answers for insert with check (
  session_id in (select id from game_sessions where player_id = auth.uid())
);

-- Enable realtime on game_sessions for leaderboard
alter publication supabase_realtime add table game_sessions;

-- Seed Questions
-- JavaScript Questions
insert into questions (question, option_a, option_b, option_c, option_d, correct_option, category, difficulty) values
('What is the result of typeof null in JavaScript?', '"null"', '"undefined"', '"object"', '"boolean"', 'C', 'javascript', 'easy'),
('Which of these is NOT part of the JavaScript event loop?', 'Call Stack', 'Task Queue', 'Heap', 'Thread Pool', 'D', 'javascript', 'medium'),
('What will this output? let a = 10; function f() { console.log(a); let a = 20; } f()', '10', '20', 'undefined', 'ReferenceError', 'D', 'javascript', 'hard'),
('What does a Promise in "pending" state mean?', 'It was rejected', 'It was fulfilled', 'It hasn''t settled yet', 'It was cancelled', 'C', 'javascript', 'easy'),
('What is the result of 0 === false in JavaScript?', 'true', 'false', 'TypeError', 'undefined', 'B', 'javascript', 'easy'),
('What is hoisting in JavaScript?', 'Moving elements in the DOM', 'Declarations moved to top of scope', 'A sorting algorithm', 'An error handling pattern', 'B', 'javascript', 'medium'),
('Which array method returns a new array without modifying the original?', 'splice()', 'push()', 'map()', 'sort()', 'C', 'javascript', 'medium'),
('Which ES6 feature allows extracting values from arrays into variables?', 'Spread operator', 'Destructuring', 'Template literals', 'Arrow functions', 'B', 'javascript', 'easy'),
-- Nerdearla Questions
('In what year was Nerdearla founded?', '2012', '2014', '2016', '2018', 'B', 'nerdearla', 'easy'),
('In which countries has Nerdearla been held?', 'AR, BR, MX, CL', 'AR, CL, MX, ES', 'AR, CO, PE, CL', 'AR, UY, BR, MX', 'B', 'nerdearla', 'medium'),
('What is the main venue for Nerdearla in Buenos Aires?', 'Teatro Colón', 'Centro Cultural Konex', 'Luna Park', 'Usina del Arte', 'B', 'nerdearla', 'easy'),
('Which UNIX creator was a speaker at Nerdearla?', 'Dennis Ritchie', 'Ken Thompson', 'Brian Kernighan', 'Linus Torvalds', 'B', 'nerdearla', 'hard'),
('Which CSS creator gave a talk at Nerdearla?', 'Brendan Eich', 'Tim Berners-Lee', 'Håkon Wium Lie', 'Eric Meyer', 'C', 'nerdearla', 'hard'),
('What is sysarmy, the organization behind Nerdearla?', 'A software company', 'A community of sysadmins and IT professionals', 'A government agency', 'A university program', 'B', 'nerdearla', 'medium'),
('Is Nerdearla a free event?', 'No, tickets cost $50', 'Only the first day is free', 'Yes, it has always been free', 'It depends on the country', 'C', 'nerdearla', 'easy');
