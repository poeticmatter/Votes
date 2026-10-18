import type { TownColor } from '../rules/types'

// The three town colours tiles come in. Pale enough that every player's cube stands out
// on them, and stepped in lightness (sand lightest, slate darkest) as well as hue, so
// they stay apart with the common forms of colour blindness. Glyphs on them are ink.

export interface TownLook {
  name: string
  fill: string
}

export const TOWN_LOOKS: Record<TownColor, TownLook> = {
  sand: { name: 'Sand', fill: '#f1e1b8' },
  sage: { name: 'Sage', fill: '#a9cf94' },
  slate: { name: 'Slate', fill: '#8ea6c2' },
}
