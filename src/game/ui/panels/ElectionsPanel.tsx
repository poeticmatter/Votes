import type { SeatReason, SeatResult, VotesState } from '../../rules/types'
import { CubeChip, useColorNameOf } from '../names'
import { CityResult } from './CitiesPanel'
import { Panel } from './Panel'

const TIE_EXPLANATIONS: Record<SeatReason, string | null> = {
  mostPeople: null,
  tieToGrey: 'tie, to grey',
}

function SeatLine({ seat }: { seat: SeatResult }) {
  const colorNameOf = useColorNameOf()
  const tie = seat.people.length ? TIE_EXPLANATIONS[seat.reason] : 'empty, to grey'
  return (
    <li className="flex flex-wrap items-center gap-x-1.5">
      <span className="text-ink-faint">{seat.town}</span> Residence: <CubeChip color={seat.winner} size={11} />{' '}
      {colorNameOf(seat.winner)}
      {tie && <span className="italic">({tie})</span>}
    </li>
  )
}

export function ElectionsPanel({ state }: { state: VotesState }) {
  if (state.elections.length === 0) return null
  const newestFirst = [...state.elections].reverse()
  return (
    <Panel title="Elections">
      {newestFirst.map((result, index) => (
        <details key={result.number} open={index === 0} className="group">
          <summary className="cursor-pointer text-sm font-bold select-none">
            Election {result.number} <span className="font-normal text-ink-soft">· turn {result.turn}</span>
          </summary>
          <div className="flex flex-col gap-2 pt-1 text-sm">
            <CityResult result={result} />
            <details>
              <summary className="cursor-pointer text-xs font-semibold text-ink-soft select-none">Seats</summary>
              <ul className="flex flex-col gap-0.5 pt-1 text-xs text-ink-soft">
                {result.seats.map(seat => (
                  <SeatLine key={seat.residence} seat={seat} />
                ))}
              </ul>
            </details>
          </div>
        </details>
      ))}
    </Panel>
  )
}
