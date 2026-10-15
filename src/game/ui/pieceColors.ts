import { INDEPENDENT, type CubeColor } from '../rules/types'

// Okabe-Ito based, so the five stay distinguishable with the common forms of colour
// blindness (from the asset generator's src/pieces/playerColors.js). `ink` is the
// colour for glyphs drawn on top of the fill: yellow and pink are too light for white.

export interface PieceColor {
  name: string
  fill: string
  ink: string
}

export const PIECE_COLORS: Record<CubeColor, PieceColor> = {
  vermillion: { name: 'Vermillion', fill: '#d55e00', ink: '#ffffff' },
  blue: { name: 'Cobalt', fill: '#0072b2', ink: '#ffffff' },
  yellow: { name: 'Saffron', fill: '#f0c419', ink: '#3b2f05' },
  green: { name: 'Jade', fill: '#009e73', ink: '#ffffff' },
  pink: { name: 'Orchid', fill: '#cc79a7', ink: '#3d1630' },
  [INDEPENDENT]: { name: 'Grey', fill: '#a3a7ab', ink: '#2b2d30' },
}
