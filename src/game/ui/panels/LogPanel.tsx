import { cityAt } from '../../rules/boardQueries'
import type { LogEntry, MoveReason, PlayerColor, VotesState } from '../../rules/types'
import { cityLabel, CubeChip, describeHex, PlayerChip, TILE_NAMES } from '../names'
import { Panel } from './Panel'

const RECENT_ENTRY_COUNT = 25

/** The voter's cube that an arrival or a move adds to the bag. */
function BagCube({ color }: { color: PlayerColor }) {
  return (
    <strong className="inline-flex items-center gap-1">
      +1 cube <CubeChip color={color} />
    </strong>
  )
}

const MOVE_REASONS: Record<MoveReason, string> = {
  levelling: 'Levelling',
  schoolPull: 'School pull',
}

function EntryText({ entry, state }: { entry: LogEntry; state: VotesState }) {
  switch (entry.kind) {
    case 'placed':
      return (
        <>
          <PlayerChip color={entry.player} /> placed a {TILE_NAMES[entry.tile]} in city {cityLabel(cityAt(state, entry.at))}.
        </>
      )
    case 'passed':
      return (
        <>
          <PlayerChip color={entry.player} /> couldn’t place a tile and passed.
        </>
      )
    case 'arrived':
      return (
        <>
          <CubeChip color={entry.color} /> A person drawn from the bag moved into the {describeHex(state, entry.residence)}. Bag:{' '}
          <BagCube color={entry.voter} />
        </>
      )
    case 'moved':
      return (
        <>
          <CubeChip color={entry.color} /> {MOVE_REASONS[entry.reason]}: a person moved from the {describeHex(state, entry.from)} into
          the {describeHex(state, entry.to)}. Bag: <BagCube color={entry.voter} />
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
