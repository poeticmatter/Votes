import { hexAt } from '../../map/board'
import { hexCorners, roundedPolygonPath, type HexKey } from '../../map/hexGrid'
import { tilesInBoardOrder } from '../../rules/boardQueries'
import type { Tile, VotesState } from '../../rules/types'
import { COLORS } from '../theme'
import { centerOfHex, HEX_RADIUS, MAP_SIZE, sharedEdgeMidpoint, TILE_RADIUS } from './geometry'
import { MapSurface } from './MapSurface'
import { MergerMarker, TilePiece } from './Pieces'

// Room around the grid for merger markers on edge hexes.
const MAP_MARGIN = 24
const VIEW_BOX = `${-MAP_MARGIN} ${-MAP_MARGIN} ${MAP_SIZE.width + 2 * MAP_MARGIN} ${MAP_SIZE.height + 2 * MAP_MARGIN}`

// Target rings sit in the gutter between a tile's edge and its cell's edge.
const TARGET_RING_RADIUS = HEX_RADIUS * 0.86
const TARGET_RING_WIDTH = 7
const LAST_PLACED_RING_RADIUS = TILE_RADIUS + 7
const PREVIEW_OPACITY = 0.8

export interface TilePreview {
  tile: Tile
  at: HexKey
}

interface MapViewProps {
  state: VotesState
  /** Hexes the viewer may click right now. */
  targets: HexKey[]
  describeTarget: (key: HexKey) => string
  onTarget: (key: HexKey) => void
  preview: TilePreview | null
  /** Hexes to draw attention to, such as where the person being moved comes from. */
  emphasized: HexKey[]
}

function HexRing({ at, radius, className }: { at: HexKey; radius: number; className: string }) {
  return <path d={roundedPolygonPath(hexCorners(centerOfHex(at), radius), 8)} className={className} />
}

function Target({ at, label, onSelect }: { at: HexKey; label: string; onSelect: () => void }) {
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={label}
      className="group cursor-pointer focus:outline-none"
      onClick={onSelect}
      onKeyDown={event => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        onSelect()
      }}
    >
      <title>{label}</title>
      <path
        d={roundedPolygonPath(hexCorners(centerOfHex(at), HEX_RADIUS * 0.95), 10)}
        className="fill-ink/5 transition-colors group-hover:fill-ink/20 group-focus-visible:fill-ink/20"
      />
      <HexRing at={at} radius={TARGET_RING_RADIUS} className="fill-none stroke-ink" />
    </g>
  )
}

export function MapView({ state, targets, describeTarget, onTarget, preview, emphasized }: MapViewProps) {
  const lastPlaced = state.turn.placedAt
  return (
    <svg viewBox={VIEW_BOX} className="block h-auto w-full select-none" role="group" aria-label="Map">
      <MapSurface />

      {tilesInBoardOrder(state).map(({ key, tile }) => (
        <TilePiece key={key} tile={tile} center={centerOfHex(key)} townLetter={hexAt(key).residenceSite} />
      ))}

      {lastPlaced && (
        <HexRing at={lastPlaced} radius={LAST_PLACED_RING_RADIUS} className="fill-none stroke-ink-soft [stroke-dasharray:10_7] [stroke-width:4]" />
      )}

      {preview && (
        <g opacity={PREVIEW_OPACITY} pointerEvents="none">
          <TilePiece tile={preview.tile} center={centerOfHex(preview.at)} townLetter={null} />
        </g>
      )}

      {emphasized.map(key => (
        <HexRing key={key} at={key} radius={TARGET_RING_RADIUS} className="fill-none stroke-ink [stroke-width:10]" />
      ))}

      <g strokeWidth={TARGET_RING_WIDTH}>
        {targets.map(key => (
          <Target key={key} at={key} label={describeTarget(key)} onSelect={() => onTarget(key)} />
        ))}
      </g>

      {state.mergers.map(marker => (
        <MergerMarker key={marker.number} center={sharedEdgeMidpoint(marker.between)} number={marker.number} />
      ))}

      <rect
        x={-MAP_MARGIN}
        y={-MAP_MARGIN}
        width={MAP_SIZE.width + 2 * MAP_MARGIN}
        height={MAP_SIZE.height + 2 * MAP_MARGIN}
        fill="none"
        stroke={COLORS.rule}
        strokeWidth={2}
        rx={24}
        pointerEvents="none"
      />
    </svg>
  )
}
