import type { PlayerIndex, PlayerProfile } from 'game-kit/turns'
import { peopleOnBoard } from '../../rules/boardQueries'
import { PLACEABLE_KINDS } from '../../rules/placement'
import type { PlaceableKind, VotesState } from '../../rules/types'
import { countOf, PlayerChip, PLURAL_TILE_NAMES, TILE_NAMES, useIsViewer } from '../names'
import { useViewer } from '../viewer'
import { Panel } from './Panel'

/**
 * Seats in turn order from the viewer's own, or from the first player's for a spectator.
 * Seat order would give a solo playtester's real seat away.
 */
function useSeatsFromViewer(state: VotesState): PlayerIndex[] {
  const { role } = useViewer()
  const count = state.players.length
  const start = role === 'spectator' ? state.firstPlayerIndex : role
  return state.players.map((_, offset) => (start + offset) % count)
}

/** "2 Residences, 1 School", or "none": the tiles in a player's own supply. */
function handText(supply: Record<PlaceableKind, number>): string {
  const held = PLACEABLE_KINDS.filter(kind => supply[kind] > 0)
  if (held.length === 0) return 'none'
  return held.map(kind => countOf(supply[kind], TILE_NAMES[kind], PLURAL_TILE_NAMES[kind])).join(', ')
}

export function PlayersPanel({ state, players }: { state: VotesState; players: PlayerProfile[] }) {
  const isViewer = useIsViewer()
  const seats = useSeatsFromViewer(state)
  const people = peopleOnBoard(state)
  const isOver = state.phase.kind === 'gameOver'

  return (
    <Panel title="Players">
      <ul className="flex flex-col divide-y divide-slot">
        {seats.map(seat => {
          const player = state.players[seat]
          const isActive = !isOver && seat === state.turn.playerIndex
          const isOffline = players[seat]?.isOnline === false
          return (
            <li key={player.color} className={`flex items-center gap-3 py-2 ${isActive ? 'font-semibold' : ''}`}>
              <span aria-label={isActive ? 'Playing now' : undefined} className="w-3 text-ink">
                {isActive ? '▶' : ''}
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate">
                  <PlayerChip color={player.color} />
                  {isViewer(player.color) && players[seat] && <span className="font-normal text-ink-soft"> ({players[seat].name})</span>}
                  {seat === state.firstPlayerIndex && <span className="ml-1 text-xs font-normal text-ink-faint">first</span>}
                  {isOffline && <span className="ml-1 text-xs font-normal text-alert">offline</span>}
                </span>
                <span className="text-xs font-normal text-ink-soft">
                  {countOf(people.filter(color => color === player.color).length, 'cube')} on the board · tiles: {handText(player.supply)}
                </span>
              </div>
              <span className="text-2xl font-bold tabular-nums" aria-label={`${player.score} points`}>
                {player.score}
              </span>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
