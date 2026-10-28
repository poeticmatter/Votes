import type { EdgeRef, HexCoord } from './hexGrid'

// The printed map. This is the only place map content lives: towns, terrain and rail
// adjacency are derived from it in board.ts, so a map change is an edit here.
//
// Hexes are [col, row] on a flat-top grid where odd columns sit half a hex lower (see
// hexGrid.ts). The rail runs along hex edges, written as [col, row, side] in path
// order; an edge on the map border names the on-map hex.

export const GRID = { columns: 11, rows: 7 } as const

export const MOUNTAINS: readonly HexCoord[] = [
  [0, 0], [0, 1], [0, 6], [1, 0], [1, 6], [2, 0],
  [4, 3], [4, 4], [5, 3], [5, 4], [5, 6], [6, 3],
  [6, 6], [8, 1], [8, 2], [9, 1], [9, 5], [9, 6],
  [10, 0], [10, 6],
]

/** Factories printed on the map from the start. Each sits next to a town's tiles, so it begins in that town's city. */
export const STARTING_FACTORIES: readonly HexCoord[] = [[2, 6]]

export interface TownSite {
  /** Where the town's starting Residence goes at setup. */
  residence: HexCoord
  /** The town's printed Station, beside its Residence and on the rail. */
  station: HexCoord
}

// Five town sites; the letter names the town.
export const TOWN_SITES = {
  A: { residence: [8, 6], station: [8, 5] },
  B: { residence: [9, 2], station: [10, 2] },
  C: { residence: [7, 0], station: [6, 0] },
  D: { residence: [1, 1], station: [2, 2] },
  E: { residence: [4, 6], station: [3, 5] },
} as const satisfies Record<string, TownSite>

export type TownId = keyof typeof TOWN_SITES

// One line, snaking through every town past its Station, from the south edge up the
// east side, back west along the north, and down to the south edge again. It bounds
// nothing; it only decides which hexes border the rail.
export const RAIL: readonly EdgeRef[] = [
  [7, 6, 'SE'], [7, 6, 'NE'], [7, 5, 'SE'], [8, 5, 'S'], [8, 5, 'SE'],
  [9, 4, 'S'], [9, 4, 'SE'], [9, 4, 'NE'], [9, 3, 'SE'], [9, 3, 'NE'],
  [9, 2, 'SE'], [9, 2, 'NE'], [9, 1, 'SE'], [9, 1, 'NE'], [9, 0, 'S'],
  [8, 1, 'NE'], [8, 0, 'S'], [7, 0, 'SE'], [7, 0, 'S'], [6, 1, 'NE'],
  [6, 0, 'S'], [5, 0, 'SE'], [5, 0, 'S'], [4, 1, 'SE'], [4, 1, 'S'],
  [3, 1, 'SE'], [3, 1, 'S'], [2, 2, 'SE'], [2, 3, 'NE'], [2, 3, 'SE'],
  [2, 4, 'NE'], [2, 4, 'SE'], [2, 5, 'NE'], [3, 4, 'S'], [3, 5, 'NE'],
  [3, 5, 'SE'], [3, 6, 'NE'], [3, 6, 'SE'],
]
