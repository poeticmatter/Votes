import { countVotes } from '../../rules/elections'
import { INDEPENDENT, PLAYER_COLORS, type CityElection, type CubeColor, type ElectionResult, type VotesState } from '../../rules/types'
import { CubeChip, PlayerChip } from '../names'
import { Panel } from './Panel'

const ALL_COLORS: CubeColor[] = [INDEPENDENT, ...PLAYER_COLORS]

type ColorCounts = Partial<Record<CubeColor, number>>

function largestFirst(counts: ColorCounts): [CubeColor, number][] {
  return ALL_COLORS.map((color): [CubeColor, number] => [color, counts[color] ?? 0])
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
}

export function ColorTally({ counts, emptyText }: { counts: ColorCounts; emptyText: string }) {
  const tally = largestFirst(counts)
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

export function Scorers({ city }: { city: CityElection }) {
  if (city.scorers.length === 0) {
    const greyLeads = largestFirst(city.seats)[0]?.[0] === INDEPENDENT
    return <span className="text-ink-soft">{greyLeads ? 'Grey leads: nobody scores' : 'Nobody scores'}</span>
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2">
      {city.scorers.map(color => (
        <PlayerChip key={color} color={color} />
      ))}
      <span className="text-ink-soft">
        +{city.factoryPoints} {city.factoryPoints === 1 ? 'point' : 'points'}
      </span>
    </span>
  )
}

export function CityRows({ result }: { result: ElectionResult }) {
  return (
    <ul className="flex flex-col divide-y divide-slot text-sm">
      {result.cities.map(city => (
        <li key={city.districts.join('')} className="flex flex-col gap-1 py-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-bold">{city.districts.join(' + ')}</span>
            <ColorTally counts={city.seats} emptyText="no seats filled" />
          </div>
          <Scorers city={city} />
        </li>
      ))}
    </ul>
  )
}

/** Where every city stands if an election were held now. */
export function CitiesPanel({ state }: { state: VotesState }) {
  return (
    <Panel title="Cities: if the vote were now">
      <CityRows result={countVotes(state)} />
    </Panel>
  )
}
