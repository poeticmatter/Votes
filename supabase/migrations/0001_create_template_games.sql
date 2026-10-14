-- Async play storage for this game.
--
-- Every game in the lab shares one Supabase project and owns its own table, named
-- `<game-id>_games` (see SUPABASE_TABLE in src/game.config.ts). `npm run init-game`
-- renames this file and the table.
--
-- One row per match, keyed by room code. Turn resolution runs client-side (see
-- src/platform/asyncMatchApi.ts); this table stores data only.
--
-- There is no auth: knowing the room code is the access credential, the same trust
-- model as the PeerJS share link. The permissive RLS policies are intentional for
-- playtesting with friends. The Supabase security advisor will flag them; that's expected.

create table if not exists public.template_games (
  id          text primary key,                 -- room code (uppercase)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  settings    jsonb not null,                   -- game settings from the lobby
  state       jsonb not null,                   -- authoritative game state
  turn        integer not null,                 -- mirrors state.turn; guards stale writes
  p1_plan     jsonb,                            -- pending plan for player 1, null when none
  p2_plan     jsonb,                            -- pending plan for player 2, null when none
  p2_joined   boolean not null default false
);

alter table public.template_games enable row level security;

create policy "anon read"   on public.template_games for select using (true);
create policy "anon insert" on public.template_games for insert with check (true);
create policy "anon update" on public.template_games for update using (true) with check (true);

-- Realtime so a player who is online sees the board advance live.
alter publication supabase_realtime add table public.template_games;
