import type { SeatResult, VotesState } from '../../rules/types'
import { CubeChip, describeHex, useColorNameOf } from '../names'
import { CityResult } from './CitiesPanel'
import { Panel } from './Panel'

function SeatLine({ seat, state }: { seat: SeatResult; state: VotesState }) {
  const colorNameOf = useColorNameOf()
  return (
    <li className="flex flex-wrap items-center gap-x-1.5">
      <span className="text-ink-faint">{describeHex(state, seat.residence)}:</span>
      {seat.winner ? (
        <>
          <CubeChip color={seat.winner} size={11} /> {colorNameOf(seat.winner)}
          {seat.reason === 'leftmostOfTie' && <span className="italic">(tie, the leftmost wins)</span>}
        </>
      ) : (
        <span className="italic">empty, counts for nobody</span>
      )}
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
                  <SeatLine key={seat.residence} seat={seat} state={state} />
                ))}
              </ul>
            </details>
          </div>
        </details>
      ))}
    </Panel>
  )
}
