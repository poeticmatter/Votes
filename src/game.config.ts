/**
 * Identity of this game within the game lab. `npm run init-game` rewrites these values.
 *
 * `id` must be unique across every lab game: it namespaces the Supabase table, the
 * PeerJS room ids on the public PeerJS server, and localStorage keys, so two games can
 * never collide on shared infrastructure.
 */
export const GAME_CONFIG = {
  id: 'votes',
  title: 'Votes',
  tagline: 'Build districts, bring in families, win the seats when cities merge. For 2–5 players.',
} as const

/** The Supabase table this game owns. Must match supabase/migrations/. */
export const SUPABASE_TABLE = `${GAME_CONFIG.id}_games`
