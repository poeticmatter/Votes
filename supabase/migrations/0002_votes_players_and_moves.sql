-- Votes is for 2–5 players taking turns in order, so the template's two-player,
-- simultaneous-plan columns go:
--
-- * `players` lists who has taken a seat, in seat order, as [{ "name": "…" }]. The
--   game starts once it holds `player_count` entries.
-- * `version` (was `turn`) counts applied moves. Each move rewrites `state` and bumps
--   `version`, guarded on the previous value, so a stale or duplicate move matches no
--   row. Moves are applied client-side by the active player (src/platform/asyncMatchApi.ts).
--
-- Seats are claimed through votes_claim_seat so two people joining at once can't take
-- the same seat: the update re-checks the seat count under the row lock.

-- Rows in the template's two-player format can't be resumed. (The table was empty
-- when this migration was written.)
delete from public.votes_games;

alter table public.votes_games
  drop column p1_plan,
  drop column p2_plan,
  drop column p2_joined,
  add column player_count integer not null check (player_count between 2 and 5),
  add column players jsonb not null default '[]'::jsonb check (jsonb_typeof(players) = 'array');

alter table public.votes_games rename column turn to version;

-- Returns the claimed seat (0-based), or null when the room is full or doesn't exist.
create or replace function public.votes_claim_seat(room_id text, player_name text)
returns integer
language sql
set search_path = ''
as $$
  update public.votes_games
     set players = players || jsonb_build_array(jsonb_build_object('name', left(btrim(player_name), 24))),
         updated_at = now()
   where id = room_id
     and jsonb_array_length(players) < player_count
  returning jsonb_array_length(players) - 1;
$$;

grant execute on function public.votes_claim_seat(text, text) to anon, authenticated;
