import type { PlayerProfile } from 'game-kit/turns'
import { familiesOnBoard } from '../../rules/boardQueries'
import type { VotesState } from '../../rules/types'
import { countOf, PlayerChip, seatOfColor, useIsViewer } from '../names'
import { Panel } from './Panel'

export function PlayersPanel({ state, players }: { state: VotesState; players: PlayerProfile[] }) {
  const isViewer = useIsViewer()
  const families = familiesOnBoard(state)
  const isOver = state.phase.kind === 'gameOver'

  return (
    <Panel title="Players">
      <ul className="flex flex-col divide-y divide-slot">
        {state.players.map((player, index) => {
          const isActive = !isOver && index === state.turn.playerIndex
          const isOffline = players[seatOfColor(player.color)]?.isOnline === false
          return (
            <li key={player.color} className={`flex items-center gap-3 py-2 ${isActive ? 'font-semibold' : ''}`}>
              <span aria-label={isActive ? 'Playing now' : undefined} className="w-3 text-ink">
                {isActive ? '▶' : ''}
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate">
                  <PlayerChip color={player.color} />
                  {isViewer(player.color) && players[index] && <span className="font-normal text-ink-soft"> ({players[index].name})</span>}
                  {index === state.firstPlayerIndex && <span className="ml-1 text-xs font-normal text-ink-faint">first</span>}
                  {isOffline && <span className="ml-1 text-xs font-normal text-alert">offline</span>}
                </span>
                <span className="text-xs font-normal text-ink-soft">
                  {countOf(player.residencesLeft, 'Residence')} · {countOf(player.stationsLeft, 'Station')} left ·{' '}
                  {countOf(families.filter(color => color === player.color).length, 'cube')} on the board
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
