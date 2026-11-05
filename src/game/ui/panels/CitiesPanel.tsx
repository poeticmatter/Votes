import { citiesOf } from '../../rules/boardQueries'
import { countVotes, type ColorCounts } from '../../rules/elections'
import { INDEPENDENT, PLAYER_COLORS, type CubeColor, type ElectionResult, type VotesState } from '../../rules/types'
import { cityLabel, countOf, CubeChip, PlayerChip } from '../names'
import { useByLook } from '../viewer'
import { Panel } from './Panel'

const ALL_COLORS: CubeColor[] = [INDEPENDENT, ...PLAYER_COLORS]

/** Equal counts keep the order `colors` gives them. */
function largestFirst(counts: ColorCounts, colors: readonly CubeColor[]): [CubeColor, number][] {
  return colors
    .map((color): [CubeColor, number] => [color, counts[color] ?? 0])
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
}

export function ColorTally({ counts, emptyText }: { counts: ColorCounts; emptyText: string }) {
  const byLook = useByLook()
  const tally = largestFirst(counts, byLook(ALL_COLORS))
  if (tally.length === 0) return <span className="text-ink-faint">{emptyText}</span>
  return (
    <span className="inline-flex flex-wrap gap-x-2">
      {tally.map(([color, count]) => (
        <span key={color} className="inline-flex items-center gap-1 tabular-nums">
          <CubeChip color={color} /> {count}
        </span>
      ))}
    </span>
  )
}

function Payout({ result }: { result: ElectionResult }) {
  const byLook = useByLook()
  if (result.pointsPerSeat === 0) return <span className="text-ink-soft">No face-up Factory: nobody scores</span>
  const scorers = byLook(PLAYER_COLORS.filter(color => (result.scores[color] ?? 0) > 0))
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-ink-soft">
        {countOf(result.pointsPerSeat, 'face-up Factory', 'face-up Factories')}: {countOf(result.pointsPerSeat, 'point')} per seat
      </span>
      <span className="inline-flex flex-wrap items-center gap-x-3">
        {scorers.length === 0 && <span className="text-ink-soft">No player holds a seat</span>}
        {scorers.map(color => (
          <span key={color} className="inline-flex items-center gap-1">
            <PlayerChip color={color} /> <span className="tabular-nums text-ink-soft">+{result.scores[color]}</span>
          </span>
        ))}
      </span>
    </div>
  )
}

/** A city's seats by colour and what each player would score. */
export function CityResult({ result }: { result: ElectionResult }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-bold">{cityLabel(result.city)}</span>
        <ColorTally counts={result.seatsByColor} emptyText="no seats" />
      </div>
      <Payout result={result} />
    </div>
  )
}

/** Where every city stands if it voted now. Only a newly merged city ever votes. */
export function CitiesPanel({ state }: { state: VotesState }) {
  return (
    <Panel title="Cities: if they voted now">
      <ul className="flex flex-col divide-y divide-slot text-sm">
        {citiesOf(state).map(city => (
          <li key={city.join('')} className="py-2">
            <CityResult result={countVotes(state, city)} />
          </li>
        ))}
      </ul>
    </Panel>
  )
}
