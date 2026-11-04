import type { HexCoord } from './hexGrid'

// The printed map. This is the only place map content lives: towns and terrain are
// derived from it in board.ts, so a map change is an edit here.
//
// Hexes are [col, row] on a flat-top grid where odd columns sit half a hex lower (see
// hexGrid.ts).

export const GRID = { columns: 11, rows: 7 } as const

export const MOUNTAINS: readonly HexCoord[] = [
  [0, 0], [0, 1], [0, 6], [1, 0], [1, 6], [2, 0],
  [4, 3], [4, 4], [5, 3], [5, 4], [5, 6], [6, 3],
  [6, 6], [8, 1], [8, 2], [9, 1], [9, 5], [9, 6],
  [10, 0], [10, 6],
]

/**
 * Factories printed on the map from the start. Each sits next to a town's starting
 * Residence, so it begins in that town's city. E's stands where its Station was before
 * Draft 5.12 removed Stations.
 */
export const STARTING_FACTORIES: readonly HexCoord[] = [[3, 5]]

export interface TownSite {
  /** Where the town's starting Residence goes at setup. */
  residence: HexCoord
}

// Five town sites; the letter names the town.
export const TOWN_SITES = {
  A: { residence: [8, 6] },
  B: { residence: [9, 2] },
  C: { residence: [7, 0] },
  D: { residence: [1, 1] },
  E: { residence: [4, 6] },
} as const satisfies Record<string, TownSite>

export type TownId = keyof typeof TOWN_SITES
