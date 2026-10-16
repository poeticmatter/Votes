import { supabaseFromEnv, type GameConfig } from 'game-kit/turns'

/**
 * Identity of this game within the game lab.
 *
 * `id` must be unique across every lab game: it names the Supabase table
 * (`votes_games`) and seat-claim function (`votes_claim_seat`), and prefixes PeerJS
 * room ids and localStorage keys. Keep it in sync with supabase/migrations/.
 */
export const GAME_CONFIG: GameConfig = {
  id: 'votes',
  title: 'Votes',
  tagline: 'Build districts, bring people in by train, win the seats when cities merge. For 2–5 players.',
  supabase: supabaseFromEnv(import.meta.env),
}
