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

/** A town's starting Residence carries the town's letter inside the house. */
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

const FACTORY_OUTLINE = 'M4 43 V24 L14 17 V24 L24 17 V24 L34 17 V7 H41 V43 Z'
const FACTORY_WINDOWS = 'M9 30 H14 V35 H9 Z M19 30 H24 V35 H19 Z M29 30 H34 V35 H29 Z'

export const FactoryGlyph = ({ size, color }: GlyphProps) => (
  <Glyph size={size}>
    <path d={`${FACTORY_OUTLINE} ${FACTORY_WINDOWS}`} fill={color} fillRule="evenodd" />
  </Glyph>
)

// A mine shaft support: a cap beam over two posts, with a small gap between the beam
// and each post.
const SHAFT_TIMBERS = 'M6 9 H42 V16 H6 Z M11 19 H18 V42 H11 Z M30 19 H37 V42 H30 Z'

export const MineGlyph = ({ size, color }: GlyphProps) => (
  <Glyph size={size}>
    <path d={SHAFT_TIMBERS} fill={color} />
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
