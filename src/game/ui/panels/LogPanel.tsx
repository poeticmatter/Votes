import { cityAt } from '../../rules/boardQueries'
import type { BagReason, LogEntry, VotesState } from '../../rules/types'
import { cityLabel, countOf, CubeChip, describeHex, PlayerChip, TILE_NAMES } from '../names'
import { Panel } from './Panel'

const RECENT_ENTRY_COUNT = 25

const BAG_REASONS: Record<BagReason, string> = {
  factory: 'a cube left a Factory',
  school: 'a School drew someone from another city',
  seats: 'seats won at the merger',
}

function EntryText({ entry, state }: { entry: LogEntry; state: VotesState }) {
  switch (entry.kind) {
    case 'placed':
      return (
        <>
          <PlayerChip color={entry.player} /> placed a {TILE_NAMES[entry.tile]} in city {cityLabel(cityAt(state, entry.at))}.
        </>
      )
    case 'stocked':
      return <>The Factory drew {countOf(entry.count, 'cube')} from the bag.</>
    case 'passed':
      return (
        <>
          <PlayerChip color={entry.player} /> had no tile that fits and passed.
        </>
      )
    case 'arrived':
      return (
        <>
          <CubeChip color={entry.color} /> Merger: a person from the bag moved into the {describeHex(state, entry.residence)}.
        </>
      )
    case 'pulled':
      return (
        <>
          <CubeChip color={entry.color} /> Pulled from the {describeHex(state, entry.from)} into the {describeHex(state, entry.to)}.
        </>
      )
    case 'bagged':
      return (
        <>
          <strong className="inline-flex items-center gap-1">
            +{countOf(entry.count, 'cube')} <CubeChip color={entry.color} />
          </strong>{' '}
          to the bag: {BAG_REASONS[entry.reason]}.
        </>
      )
    case 'merger':
      return (
        <>
          <strong>Merger:</strong> {cityLabel(entry.city)} became one city. Election {entry.electionNumber} held.
        </>
      )
    case 'gameOver':
      return (
        <>
          <strong>Game over</strong>
          {entry.reason === 'nobodyCanAct' && ' (nobody could act any more)'}.
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
