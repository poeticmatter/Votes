// The Metro look, ported from the asset generator's src/theme.js: white rounded cells
// on a cool grey ground.

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
} as const

export const MAP_STYLE = {
  cellInset: 0.045,
  cellCornerRadius: 10,
  mountainGlyphSize: 58,
} as const

export const TILE_STYLE = {
  // Tiles cover 74% of their hex, leaving a ring of the cell showing round each one.
  sizeRatio: 0.74,
  cornerRadius: 12,
  // One colour for every tile: Residences, Factories, Mines and Schools differ by glyph. The outline keeps the pale fill clear of the white cells.
  fill: '#f1e1b8',
  ink: COLORS.ink,
  outline: { color: 'rgba(38, 42, 49, 0.4)', width: 2 },
} as const
