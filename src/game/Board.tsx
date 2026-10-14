import type { BoardProps, PlayerSlot, Seating, UserRole } from '../platform/types'
import type { Hand, RoundResult, RpsPlan, RpsState } from './types'

const HANDS: Hand[] = ['rock', 'paper', 'scissors']

const HAND_ICONS: Record<Hand, string> = {
  rock: '✊',
  paper: '✋',
  scissors: '✌️',
}

interface Viewer {
  role: UserRole
  seating: Seating
}

function playerLabel(slot: PlayerSlot, { role, seating }: Viewer): string {
  return seating === 'remote' && role === slot ? 'You' : `Player ${slot}`
}

function describeRound(round: RoundResult, viewer: Viewer): string {
  const hands = `${HAND_ICONS[round.p1Hand]} vs ${HAND_ICONS[round.p2Hand]}`
  if (round.winner === null) return `${hands}: draw`
  return `${hands}: ${playerLabel(round.winner, viewer)} won the round`
}

function Scoreboard({ state, viewer }: { state: RpsState; viewer: Viewer }) {
  return (
    <div className="flex gap-10 text-center">
      {([1, 2] as const).map(slot => (
        <div key={slot}>
          <p className="text-xs uppercase tracking-wider text-neutral-500">{playerLabel(slot, viewer)}</p>
          <p className="text-4xl font-bold">{state.scores[slot]}</p>
        </div>
      ))}
    </div>
  )
}

export function RpsBoard({ state, role, hasCommitted, onSubmitPlan, seating }: BoardProps<RpsState, RpsPlan>) {
  const viewer: Viewer = { role, seating }
  const { matchWinner } = state
  const isOver = matchWinner !== null
  const canPlay = role !== 'spectator' && !hasCommitted && !isOver

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-6">
      <p className="text-neutral-500 text-sm">First to {state.targetScore} · Round {state.turn}</p>
      <Scoreboard state={state} viewer={viewer} />

      {state.lastRound && <p className="text-neutral-300">{describeRound(state.lastRound, viewer)}</p>}

      {matchWinner !== null ? (
        <div className="flex flex-col items-center gap-4">
          <p className="text-2xl font-semibold">{playerLabel(matchWinner, viewer)} won the match!</p>
          <a href={window.location.pathname} className="text-blue-400 hover:text-blue-300 text-sm">
            Back to lobby
          </a>
        </div>
      ) : (
        <div className="flex gap-4">
          {HANDS.map(hand => (
            <button
              key={hand}
              disabled={!canPlay}
              onClick={() => onSubmitPlan({ turn: state.turn, hand })}
              className="w-24 h-24 text-5xl rounded-2xl bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 disabled:hover:bg-neutral-800 transition-colors"
              aria-label={hand}
            >
              {HAND_ICONS[hand]}
            </button>
          ))}
        </div>
      )}

      {hasCommitted && !isOver && <p className="text-neutral-500 text-sm animate-pulse">Waiting for your opponent…</p>}
      {seating === 'hot_seat' && !isOver && <p className="text-neutral-400 text-sm">Player {role} to choose</p>}
      {role === 'spectator' && <p className="text-purple-400 text-sm">Spectating</p>}
    </div>
  )
}
