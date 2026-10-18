import { townOf } from '../../rules/boardQueries'
import type { LogEntry, VotesState } from '../../rules/types'
import { countOf, CubeChip, PlayerChip, tileName } from '../names'
import { Panel } from './Panel'

const RECENT_ENTRY_COUNT = 15

function EntryText({ entry, state }: { entry: LogEntry; state: VotesState }) {
  switch (entry.kind) {
    case 'placed':
      return (
        <>
          <PlayerChip color={entry.player} /> placed a {tileName(entry.tile, entry.color)} in town {entry.town}.
        </>
      )
    case 'passed':
      return (
        <>
          <PlayerChip color={entry.player} /> couldn’t place a tile and passed.
        </>
      )
    case 'relocated':
      return (
        <>
          <CubeChip color={entry.color} /> A person was relocated from town {townOf(state, entry.from)} to town {townOf(state, entry.to)}.
          Into the bag: <CubeChip color={entry.voter} />
        </>
      )
    case 'schoolVotes':
      return (
        <>
          School votes: {countOf(entry.count, 'cube')} <CubeChip color={entry.player} /> into the bag.
        </>
      )
    case 'arrived':
      return (
        <>
          {entry.people.map((color, position) => (
            // Two people of one colour can arrive together, so the colour alone isn't unique.
            <CubeChip key={`${color}-${position}`} color={color} />
          ))}{' '}
          arrived at town {entry.town}’s Station.
        </>
      )
    case 'housed':
      return (
        <>
          <CubeChip color={entry.color} /> A person moved into a Residence in town {townOf(state, entry.to)}. Into the bag:{' '}
          <CubeChip color={entry.voter} />
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
              <EntryText entry={entry} state={state} />
            </span>
          </li>
        ))}
      </ol>
    </Panel>
  )
}
