import type { ReactNode } from 'react'
import type { Point } from '../../map/hexGrid'

// Glyphs from the asset generator's src/pieces/glyphs.jsx. Each is drawn on a 48-unit
// square; shapes with cut-outs use evenodd so the holes show the tile colour beneath.

const GLYPH_VIEWBOX = 48

interface GlyphProps {
  size: number
  color: string
}

function Glyph({ size, children }: { size: number; children: ReactNode }) {
  return (
    <svg viewBox={`0 0 ${GLYPH_VIEWBOX} ${GLYPH_VIEWBOX}`} width={size} height={size}>
      {children}
    </svg>
  )
}

const HOUSE_OUTLINE = 'M24 6 L42 21 V42 H6 V21 Z'

export const HouseGlyph = ({ size, color }: GlyphProps) => (
  <Glyph size={size}>
    <path d={`${HOUSE_OUTLINE} M19.5 42 V30 H28.5 V42 Z`} fill={color} fillRule="evenodd" />
  </Glyph>
)

/** A printed Residence carries its district letter inside the house. */
export const LetteredHouseGlyph = ({
  size,
  color,
  letter,
  letterColor,
  fontFamily,
}: GlyphProps & { letter: string; letterColor: string; fontFamily: string }) => (
  <Glyph size={size}>
    <path d={HOUSE_OUTLINE} fill={color} />
    <text x={24} y={36.5} textAnchor="middle" fontFamily={fontFamily} fontSize={19} fontWeight={700} fill={letterColor}>
      {letter}
    </text>
  </Glyph>
)

const STATION_BODY = 'M18 5 H30 A6 6 0 0 1 36 11 V29 A6 6 0 0 1 30 35 H18 A6 6 0 0 1 12 29 V11 A6 6 0 0 1 18 5 Z'
const STATION_WINDOW = 'M18 10 H30 A2 2 0 0 1 32 12 V19 A2 2 0 0 1 30 21 H18 A2 2 0 0 1 16 19 V12 A2 2 0 0 1 18 10 Z'
const STATION_LIGHTS = 'M15 28.5 a2.5 2.5 0 1 0 5 0 a2.5 2.5 0 1 0 -5 0 Z M28 28.5 a2.5 2.5 0 1 0 5 0 a2.5 2.5 0 1 0 -5 0 Z'
const STATION_LEGS = 'M14.5 35 L10.5 43.5 H15 L19 35 Z M29 35 L33 43.5 H37.5 L33.5 35 Z'

export const StationGlyph = ({ size, color }: GlyphProps) => (
  <Glyph size={size}>
    <path d={`${STATION_BODY} ${STATION_WINDOW} ${STATION_LIGHTS}`} fill={color} fillRule="evenodd" />
    <path d={STATION_LEGS} fill={color} />
  </Glyph>
)

const FACTORY_OUTLINE = 'M4 43 V24 L14 17 V24 L24 17 V24 L34 17 V7 H41 V43 Z'
const FACTORY_WINDOWS = 'M9 30 H14 V35 H9 Z M19 30 H24 V35 H19 Z M29 30 H34 V35 H29 Z'

export const FactoryGlyph = ({ size, color }: GlyphProps) => (
  <Glyph size={size}>
    <path d={`${FACTORY_OUTLINE} ${FACTORY_WINDOWS}`} fill={color} fillRule="evenodd" />
  </Glyph>
)

export const SchoolGlyph = ({ size, color }: GlyphProps) => (
  <Glyph size={size}>
    <path d="M23 13 C17 9 10 9 4 11 V39 C10 37 17 37 23 41 Z" fill={color} />
    <path d="M25 13 C31 9 38 9 44 11 V39 C38 37 31 37 25 41 Z" fill={color} />
  </Glyph>
)

export const MountainGlyph = ({ size, color }: GlyphProps) => (
  <Glyph size={size}>
    <path d="M4 38 L17 14 L25 27 L31 19 L44 38 Z" fill={color} />
  </Glyph>
)

/** Two pines, the nearer one larger. */
export const ForestGlyph = ({ size, color }: GlyphProps) => (
  <Glyph size={size}>
    <path d="M30 6 L40 20 H36 L43 31 H33 V36 H27 V31 H17 L24 20 H20 Z" fill={color} />
    <path d="M15 14 L24 27 H20.5 L27 38 H18 V43 H12 V38 H3 L9.5 27 H6 Z" fill={color} />
  </Glyph>
)

export const WavesGlyph = ({ size, color, strokeWidth }: GlyphProps & { strokeWidth: number }) => (
  <Glyph size={size}>
    <g fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
      <path d="M8 19 q4 -4 8 0 t8 0 t8 0 t8 0" />
      <path d="M8 29 q4 -4 8 0 t8 0 t8 0 t8 0" />
    </g>
  </Glyph>
)

/** The draw bag: a pouch with its tie showing as a cut-out band. */
export const BagGlyph = ({ size, color }: GlyphProps) => (
  <Glyph size={size}>
    <path
      d="M17 7 H31 L27.5 14 C36 16.5 42 25 42 33 C42 40.5 35 44 24 44 C13 44 6 40.5 6 33 C6 25 12 16.5 20.5 14 Z M19 15.5 H29 V18.5 H19 Z"
      fill={color}
      fillRule="evenodd"
    />
  </Glyph>
)

/** Glyphs render as nested <svg>s at the origin; this centres one on a point. */
export const PlaceGlyph = ({ center, size, children }: { center: Point; size: number; children: ReactNode }) => (
  <g transform={`translate(${(center.x - size / 2).toFixed(2)} ${(center.y - size / 2).toFixed(2)})`}>{children}</g>
)
