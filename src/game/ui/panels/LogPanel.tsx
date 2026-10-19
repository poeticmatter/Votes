import type { ReactNode } from 'react'
import { cityAt } from '../../rules/boardQueries'
import type { LogEntry, PlayerColor, VotesState } from '../../rules/types'
import { cityLabel, countOf, CubeChip, describeHex, PlayerChip, TILE_NAMES } from '../names'
import { Panel } from './Panel'

const RECENT_ENTRY_COUNT = 25

/** "+2 cubes" with the cubes themselves, or "no cube". */
function BagCubes({ votes, color }: { votes: number; color: PlayerColor }) {
  if (votes === 0) return <strong>no cube</strong>
  return (
    <strong className="inline-flex items-center gap-1">
      +{countOf(votes, 'cube')} <CubeChip color={color} />
    </strong>
  )
}

function Reason({ children }: { children: ReactNode }) {
  return <span className="text-ink-soft"> {children}</span>
}

function housedReason(entry: Extract<LogEntry, { kind: 'housed' }>): string {
  if (!entry.isRemote) return '1 for each person housed.'
  if (entry.votes === 0) return 'The first person from a Station one stop away costs the cube they would have earned.'
  return 'Another person from that Station: it was already charged this turn.'
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
    case 'relocated':
      return (
        <>
          <CubeChip color={entry.color} /> A person moved from the {describeHex(state, entry.from)} into the {describeHex(state, entry.to)}.
          Bag: <BagCubes votes={1} color={entry.voter} />
          <Reason>1 for each person a School relocates.</Reason>
        </>
      )
    case 'arrived':
      return (
        <>
          {entry.people.map((color, position) => (
            // Two people of one colour can arrive together, so the colour alone isn't unique.
            <CubeChip key={`${color}-${position}`} color={color} />
          ))}{' '}
          {countOf(entry.people.length, 'person', 'people')} drawn from the bag arrived at the {describeHex(state, entry.station)}.
        </>
      )
    case 'housed':
      return (
        <>
          <CubeChip color={entry.color} /> A person moved from the {describeHex(state, entry.from)}
          {entry.isRemote && ' (one stop away)'} into the {describeHex(state, entry.to)}. Bag:{' '}
          <BagCubes votes={entry.votes} color={entry.voter} />
          <Reason>{housedReason(entry)}</Reason>
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
