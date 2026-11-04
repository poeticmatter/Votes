import { memo } from 'react'
import { BOARD, type BoardHex, type Terrain } from '../../map/board'
import { hexCenter, hexCorners, roundedPolygonPath } from '../../map/hexGrid'
import { COLORS, MAP_STYLE } from '../theme'
import { HEX_RADIUS } from './geometry'
import { MountainGlyph, PlaceGlyph } from './glyphs'

// The printed map: cells and mountains. Ported from the asset generator's
// src/map/layers.jsx. It never changes during a game, so the component is memoised.

const CELL_RADIUS = HEX_RADIUS * (1 - MAP_STYLE.cellInset)

const CELL_FILLS: Record<Terrain, string> = {
  open: COLORS.cell,
  mountain: COLORS.mountain,
}

const centerOf = (hex: BoardHex) => hexCenter(hex.col, hex.row, HEX_RADIUS)

const HexCells = () => (
  <g>
    {BOARD.hexes.map(hex => (
      <path
        key={hex.key}
        d={roundedPolygonPath(hexCorners(centerOf(hex), CELL_RADIUS), MAP_STYLE.cellCornerRadius)}
        fill={CELL_FILLS[hex.terrain]}
      />
    ))}
  </g>
)

const Mountains = () => (
  <g>
    {BOARD.hexes
      .filter(hex => hex.terrain === 'mountain')
      .map(hex => (
        <PlaceGlyph key={hex.key} center={centerOf(hex)} size={MAP_STYLE.mountainGlyphSize}>
          <MountainGlyph size={MAP_STYLE.mountainGlyphSize} color={COLORS.paper} />
        </PlaceGlyph>
      ))}
  </g>
)

export const MapSurface = memo(function MapSurface() {
  return (
    <g>
      <HexCells />
      <Mountains />
    </g>
  )
})
