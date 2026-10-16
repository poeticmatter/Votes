import { countVotes, type ColorCounts } from '../../rules/elections'
import { INDEPENDENT, PLAYER_COLORS, type CubeColor, type ElectionResult, type VotesState } from '../../rules/types'
import { countOf, CubeChip, PlayerChip } from '../names'
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

function Scorers({ result }: { result: ElectionResult }) {
  const byLook = useByLook()
  if (result.scorers.length === 0) {
    const greyLeads = largestFirst(result.seatsByColor, ALL_COLORS)[0]?.[0] === INDEPENDENT
    return <span className="text-ink-soft">{greyLeads ? 'Grey leads: nobody scores' : 'Nobody scores'}</span>
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2">
      {byLook(result.scorers).map(color => (
        <PlayerChip key={color} color={color} />
      ))}
      <span className="text-ink-soft">+{countOf(result.factoryPoints, 'point')}</span>
    </span>
  )
}

/** A city's seats by colour and who scores its Factories. */
export function CityResult({ result }: { result: ElectionResult }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-bold">{result.city.join(' + ')}</span>
        <ColorTally counts={result.seatsByColor} emptyText="no seats" />
      </div>
      <Scorers result={result} />
    </div>
  )
}

/** Where every city stands if it voted now. Only a newly merged city ever votes. */
export function CitiesPanel({ state }: { state: VotesState }) {
  return (
    <Panel title="Cities: if they voted now">
      <ul className="flex flex-col divide-y divide-slot text-sm">
        {state.cities.map(city => (
          <li key={city.join('')} className="py-2">
            <CityResult result={countVotes(state, city)} />
          </li>
        ))}
      </ul>
    </Panel>
  )
}
