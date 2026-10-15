import { DISTRICT_IDS } from '../../map/board'
import { bagSize, factoryKeys, familiesOnBoard } from '../../rules/boardQueries'
import { INDEPENDENT, JOBS_PER_FACTORY, type CubeColor, type VotesState } from '../../rules/types'
import { BagGlyph } from '../map/glyphs'
import { CubeChip } from '../names'
import { PIECE_COLORS } from '../pieceColors'
import { COLORS } from '../theme'
import { Panel } from './Panel'

/** Every merger joins at least two cities, so five districts make at most this many. */
const MERGERS_IN_GAME = DISTRICT_IDS.length - 1

function bagColors(state: VotesState): CubeColor[] {
  return [INDEPENDENT, ...state.players.map(player => player.color)]
}

export function SupplyPanel({ state }: { state: VotesState }) {
  const jobs = factoryKeys(state).length * JOBS_PER_FACTORY
  const workers = familiesOnBoard(state).length

  return (
    <Panel title="Bag, jobs and mergers">
      <div className="flex items-center gap-3">
        <BagGlyph size={28} color={COLORS.ink} />
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
          {bagColors(state).map(color => (
            <span key={color} className="inline-flex items-center gap-1 tabular-nums" title={PIECE_COLORS[color].name}>
              <CubeChip color={color} /> {state.bag[color] ?? 0}
            </span>
          ))}
          <span className="text-ink-soft">({bagSize(state)} in all)</span>
        </div>
      </div>
      <p className="text-sm">
        <strong className="tabular-nums">
          {workers} of {jobs}
        </strong>{' '}
        jobs filled{jobs === 0 && ' — no Factory yet, so nobody can move in'}.
      </p>
      <p className="text-sm">
        <strong className="tabular-nums">
          {state.mergers.length} of {MERGERS_IN_GAME}
        </strong>{' '}
        mergers. The game ends with the election that leaves one city.
      </p>
    </Panel>
  )
}
