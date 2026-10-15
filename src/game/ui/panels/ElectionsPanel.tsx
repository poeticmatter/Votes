import type { DistrictElection, SeatReason, VotesState } from '../../rules/types'
import { CubeChip, useColorNameOf } from '../names'
import { CityRows, ColorTally } from './CitiesPanel'
import { Panel } from './Panel'

const TIE_EXPLANATIONS: Record<SeatReason, string | null> = {
  mostCubes: null,
  didNotTakeLastSeat: 'tie, went to the colour that didn’t take the last seat',
  compromise: 'tie, went to the compromise candidate',
  playerOrder: 'tie, settled by player order',
}

function DistrictSeats({ result }: { result: DistrictElection }) {
  const colorNameOf = useColorNameOf()
  const unfilled = result.seatCount - result.awards.length
  return (
    <li className="flex flex-col gap-0.5 py-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-semibold">
          District {result.district} · {result.seatCount} {result.seatCount === 1 ? 'seat' : 'seats'}
        </span>
        <span className="text-xs text-ink-soft">
          families: <ColorTally counts={result.families} emptyText="none" />
        </span>
      </div>
      <ol className="flex flex-col text-xs text-ink-soft">
        {result.awards.map((award, index) => (
          <li key={index} className="flex items-center gap-1.5">
            Seat {index + 1}: <CubeChip color={award.color} size={11} /> {colorNameOf(award.color)}
            {TIE_EXPLANATIONS[award.reason] && <span className="italic">({TIE_EXPLANATIONS[award.reason]})</span>}
          </li>
        ))}
        {unfilled > 0 && <li>{unfilled} left empty: no families left to fill them</li>}
      </ol>
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
          <div className="flex flex-col gap-2 pt-1">
            <CityRows result={result} />
            <details>
              <summary className="cursor-pointer text-xs font-semibold text-ink-soft select-none">Seats by district</summary>
              <ul className="flex flex-col divide-y divide-slot text-sm">
                {result.districts.map(district => (
                  <DistrictSeats key={district.district} result={district} />
                ))}
              </ul>
            </details>
          </div>
        </details>
      ))}
    </Panel>
  )
}
