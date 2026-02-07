-- Enable extensions
create extension if not exists "pgcrypto";

-- Sessions table
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  scenario text not null,
  started_at timestamptz default now(),
  ended_at timestamptz
);

-- Messages table
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  role text check (role in ('user', 'partner')),
  content text not null,
  created_at timestamptz default now()
);

-- Turn metrics table
create table if not exists turn_metrics (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references messages(id) on delete cascade,
  warmth int,
  curiosity int,
  empathy int,
  behavior_flags text[],
  evidence jsonb,
  suggestion_minimal text,
  suggestion_warmer text,
  next_rule text,
  created_at timestamptz default now()
);

-- Session reviews table
create table if not exists session_reviews (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  cold_moments jsonb,
  objective text,
  created_at timestamptz default now()
);

-- RLS
alter table sessions enable row level security;
alter table messages enable row level security;
alter table turn_metrics enable row level security;
alter table session_reviews enable row level security;

create policy "Sessions are owned by user" on sessions
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Messages belong to session owner" on messages
  for all
  using (
    exists (
      select 1 from sessions
      where sessions.id = messages.session_id
      and sessions.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from sessions
      where sessions.id = messages.session_id
      and sessions.user_id = auth.uid()
    )
  );

create policy "Turn metrics belong to session owner" on turn_metrics
  for all
  using (
    exists (
      select 1 from messages
      join sessions on sessions.id = messages.session_id
      where messages.id = turn_metrics.message_id
      and sessions.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from messages
      join sessions on sessions.id = messages.session_id
      where messages.id = turn_metrics.message_id
      and sessions.user_id = auth.uid()
    )
  );

create policy "Session reviews belong to session owner" on session_reviews
  for all
  using (
    exists (
      select 1 from sessions
      where sessions.id = session_reviews.session_id
      and sessions.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from sessions
      where sessions.id = session_reviews.session_id
      and sessions.user_id = auth.uid()
    )
  );
