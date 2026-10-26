import type { EdgeRef, HexCoord } from './hexGrid'

// The printed map. This is the only place map content lives: towns, terrain and rail
// adjacency are derived from it in board.ts, so a map change is an edit here.
//
// Hexes are [col, row] on a flat-top grid where odd columns sit half a hex lower (see
// hexGrid.ts). The rail runs along hex edges, written as [col, row, side] in path
// order; an edge on the map border names the on-map hex.

export const GRID = { columns: 11, rows: 9 } as const

export const MOUNTAINS: readonly HexCoord[] = [
  [0, 0], [0, 1], [0, 8], [1, 0], [2, 0], [3, 6],
  [3, 7], [4, 3], [4, 4], [5, 3], [5, 4], [5, 8],
  [6, 3], [6, 7], [6, 8], [7, 7], [7, 8], [8, 1],
  [8, 2], [9, 1], [10, 0], [10, 8],
]

/** Factories printed on the map from the start. Each sits next to a town's tiles, so it begins in that town's city. */
export const STARTING_FACTORIES: readonly HexCoord[] = [[1, 7]]

export interface TownSite {
  /** Where the town's starting Residence goes at setup. */
  residence: HexCoord
  /** The town's printed Station, beside its Residence and on the rail. */
  station: HexCoord
}

// Five town sites; the letter names the town.
export const TOWN_SITES = {
  A: { residence: [8, 8], station: [8, 7] },
  B: { residence: [9, 2], station: [10, 2] },
  C: { residence: [7, 0], station: [6, 0] },
  D: { residence: [1, 1], station: [2, 2] },
  E: { residence: [3, 8], station: [2, 8] },
} as const satisfies Record<string, TownSite>

export type TownId = keyof typeof TOWN_SITES

// One line, snaking through every town past its Station, from the south edge up the
// east side and back west and south to the south-west corner, where it ends. It bounds
// nothing; it only decides which Stations are one stop apart.
export const RAIL: readonly EdgeRef[] = [
  [7, 8, 'SE'], [7, 8, 'NE'], [7, 7, 'SE'], [7, 7, 'NE'], [7, 6, 'SE'],
  [7, 6, 'NE'], [7, 5, 'SE'], [8, 5, 'S'], [8, 5, 'SE'], [9, 4, 'S'],
  [9, 4, 'SE'], [9, 4, 'NE'], [9, 3, 'SE'], [9, 3, 'NE'], [9, 2, 'SE'],
  [9, 2, 'NE'], [9, 1, 'SE'], [9, 1, 'NE'], [9, 0, 'S'], [8, 1, 'NE'],
  [8, 0, 'S'], [7, 0, 'SE'], [7, 0, 'S'], [6, 1, 'NE'], [6, 0, 'S'],
  [5, 0, 'SE'], [5, 0, 'S'], [4, 1, 'SE'], [4, 1, 'S'], [3, 1, 'SE'],
  [3, 1, 'S'], [2, 2, 'SE'], [2, 2, 'S'], [1, 2, 'SE'], [1, 3, 'NE'],
  [1, 3, 'SE'], [1, 4, 'NE'], [1, 4, 'SE'], [1, 4, 'S'], [0, 5, 'SE'],
  [0, 6, 'NE'], [0, 6, 'SE'], [0, 7, 'NE'], [1, 6, 'S'], [1, 7, 'NE'],
  [1, 7, 'SE'], [1, 8, 'NE'],
]
