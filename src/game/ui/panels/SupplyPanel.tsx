import { TOWN_IDS } from '../../map/board'
import { bagSize } from '../../rules/boardQueries'
import { PLACEABLE_KINDS } from '../../rules/placement'
import { INDEPENDENT, type CubeColor, type VotesState } from '../../rules/types'
import { BagGlyph } from '../map/glyphs'
import { CubeChip, faceUpTile, PLURAL_TILE_NAMES, TileIcon, useColorNameOf } from '../names'
import { COLORS } from '../theme'
import { useByLook } from '../viewer'
import { Panel } from './Panel'

/** Every merger joins at least two cities, so five towns make at most this many. */
const MERGERS_IN_GAME = TOWN_IDS.length - 1

const TILE_ICON_WIDTH = 26

function bagColors(state: VotesState): CubeColor[] {
  return [...state.players.map(player => player.color), INDEPENDENT]
}

function TilesLeft({ state }: { state: VotesState }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {PLACEABLE_KINDS.map(kind => (
        <span key={kind} className="inline-flex items-center gap-1.5 tabular-nums" title={`${PLURAL_TILE_NAMES[kind]} in the shared supply`}>
          <TileIcon tile={faceUpTile(kind)} width={TILE_ICON_WIDTH} /> {state.supply[kind]}
        </span>
      ))}
    </div>
  )
}

export function SupplyPanel({ state }: { state: VotesState }) {
  const byLook = useByLook()
  const colorNameOf = useColorNameOf()

  return (
    <Panel title="Shared supply, bag and mergers">
      <TilesLeft state={state} />
      <div className="flex items-center gap-3">
        <BagGlyph size={28} color={COLORS.ink} />
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
          {byLook(bagColors(state)).map(color => (
            <span key={color} className="inline-flex items-center gap-1 tabular-nums" title={colorNameOf(color)}>
              <CubeChip color={color} /> {state.bag[color] ?? 0}
            </span>
          ))}
          <span className="text-ink-soft">({bagSize(state)} in all)</span>
        </div>
      </div>
      <p className="text-sm">
        <strong className="tabular-nums">
          {state.mergers.length} of {MERGERS_IN_GAME}
        </strong>{' '}
        mergers. The game ends with the election that leaves one city.
      </p>
    </Panel>
  )
}
