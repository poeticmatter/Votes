import type { Seating } from '../../../platform/types'
import { activePlayerState } from '../../rules/boardQueries'
import type { VotesState } from '../../rules/types'
import { PlayerChip } from '../names'

function GameOverBanner({ state }: { state: VotesState }) {
  if (state.phase.kind !== 'gameOver') return null
  const { winners } = state.phase
  const topScore = Math.max(...state.players.map(player => player.score))
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl bg-ink px-4 py-3 text-center text-paper">
      <p className="text-xl font-bold">Game over</p>
      <p className="flex flex-wrap items-center justify-center gap-x-2">
        {winners.map(color => (
          <span key={color} className="rounded-lg bg-paper px-2 py-0.5 text-ink">
            <PlayerChip color={color} />
          </span>
        ))}
        <span>
          {winners.length === 1 ? 'wins' : 'share the win'} with {topScore} {topScore === 1 ? 'point' : 'points'}.
        </span>
      </p>
      <a href="./" className="text-sm underline opacity-80 hover:opacity-100">
        Back to the lobby
      </a>
    </div>
  )
}

/** Whose turn it is, shouted when it's the viewer's own. */
export function TurnBanner({ state, isViewersTurn, seating }: { state: VotesState; isViewersTurn: boolean; seating: Seating }) {
  if (state.phase.kind === 'gameOver') return <GameOverBanner state={state} />

  const player = activePlayerState(state)
  if (isViewersTurn && seating === 'remote') {
    return <div className="rounded-2xl bg-ink px-4 py-2.5 text-center font-bold text-paper">Your turn · Turn {state.turn.number}</div>
  }
  return (
    <div className="flex items-center justify-center gap-2 rounded-2xl border border-rule bg-paper px-4 py-2.5">
      <span className="text-ink-soft">Turn {state.turn.number}:</span>
      <PlayerChip color={player.color} />
      <span className="text-ink-soft">{seating === 'hot_seat' ? 'to play' : 'is playing'}</span>
    </div>
  )
}
