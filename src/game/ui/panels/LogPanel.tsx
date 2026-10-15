import { districtOf } from '../../map/board'
import type { LogEntry, VotesState } from '../../rules/types'
import { countOf, CubeChip, PlayerChip, TILE_NAMES } from '../names'
import { Panel } from './Panel'

const RECENT_ENTRY_COUNT = 15

function EntryText({ entry }: { entry: LogEntry }) {
  switch (entry.kind) {
    case 'placed':
      return (
        <>
          <PlayerChip color={entry.player} /> placed a {TILE_NAMES[entry.tile]} in {districtOf(entry.at)}.
        </>
      )
    case 'passed':
      return (
        <>
          <PlayerChip color={entry.player} /> couldn’t place a tile and passed.
        </>
      )
    case 'schoolBonus':
      return (
        <>
          <PlayerChip color={entry.player} /> put {countOf(entry.cubes, 'cube')} in the bag (School bonus).
        </>
      )
    case 'family':
      return (
        <>
          <CubeChip color={entry.color} /> A family moved into {districtOf(entry.residence)}. Into the bag:{' '}
          {entry.addedToBag.map(color => (
            <CubeChip key={color} color={color} />
          ))}
        </>
      )
    case 'merger':
      return (
        <>
          <strong>Merger:</strong> {entry.city.join(' + ')} became one city. Election {entry.electionNumber} held.
        </>
      )
    case 'gameOver':
      return (
        <>
          <strong>Game over</strong>
          {entry.reason === 'nobodyCanBuild' && ' (nobody could build any more)'}.
        </>
      )
  }
}

export function LogPanel({ state }: { state: VotesState }) {
  if (state.log.length === 0) return null
  const recent = state.log.slice(-RECENT_ENTRY_COUNT).reverse()
  return (
    <Panel title="Recent events">
      <ol className="flex flex-col gap-1.5 text-sm">
        {recent.map((entry, index) => (
          <li key={state.log.length - index} className="flex gap-2">
            <span className="w-8 shrink-0 text-right text-xs tabular-nums text-ink-faint">T{entry.turn}</span>
            <span className="flex flex-wrap items-center gap-x-1">
              <EntryText entry={entry} />
            </span>
          </li>
        ))}
      </ol>
    </Panel>
  )
}
