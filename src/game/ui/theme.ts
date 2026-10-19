// The Metro look, ported from the asset generator's src/theme.js: white rounded cells
// on a cool grey ground, charcoal rails in the gutters.

export const FONT_FAMILY = "'Barlow', 'Segoe UI', Helvetica, Arial, sans-serif"

export const COLORS = {
  ground: '#e7eaef',
  cell: '#ffffff',
  mountain: '#b4bcc8',
  ink: '#262a31',
  inkSoft: '#5b6370',
  inkFaint: '#8a93a0',
  rule: '#c4cad3',
  slot: '#dde1e7',
  paper: '#ffffff',
  railSide: 'rgba(38, 42, 49, 0.14)',
} as const

export const MAP_STYLE = {
  cellInset: 0.045,
  cellCornerRadius: 10,
  // Two rails on sleepers. Bends are curves starting `curveTangent` px before each
  // corner; sleepers are counted per hex edge so spacing never drifts.
  track: { gauge: 8, railWidth: 2.5, curveTangent: 24, sleepersPerEdge: 8, sleeperLength: 22, sleeperWidth: 4.5 },
  railSideBandWidth: 9,
  mountainGlyphSize: 58,
} as const

export const TILE_STYLE = {
  // Tiles cover 74% of their hex, leaving a ring where the rail and its markings
  // stay readable once a tile is down.
  sizeRatio: 0.74,
  cornerRadius: 12,
  emptySlotDash: '3 2.5',
  // One colour for every tile: Residences, Factories, Schools and Stations differ by
  // glyph. The outline keeps the pale fill clear of the white cells.
  fill: '#f1e1b8',
  ink: COLORS.ink,
  outline: { color: 'rgba(38, 42, 49, 0.4)', width: 2 },
  emptySlot: COLORS.inkSoft,
} as const
