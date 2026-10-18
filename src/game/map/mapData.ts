import type { EdgeRef, HexCoord } from './hexGrid'

// The printed map. This is the only place map content lives: towns, terrain and rail
// adjacency are derived from it in board.ts, so a map change is an edit here.
//
// Hexes are [col, row] on a flat-top grid where odd columns sit half a hex lower (see
// hexGrid.ts). Rails and the river run along hex edges, written as [col, row, side] in
// path order; an edge on the map border names the on-map hex.

export const GRID = { columns: 11, rows: 9 } as const

export const MOUNTAINS: readonly HexCoord[] = [
  [0, 0], [0, 1], [1, 0], [2, 0],
  [3, 6], [3, 7],
  [8, 1], [8, 2], [9, 1],
]

export const LAKES: readonly HexCoord[] = [
  [1, 8],
  [2, 5], [2, 6], [3, 5],
]

// Unbuildable, like mountains and lakes.
export const FORESTS: readonly HexCoord[] = [
  [0, 8],
  [5, 7], [5, 8], [6, 7], [6, 8], [7, 7], [7, 8],
  [10, 0], [10, 8],
]

export interface TownSite {
  /** Where the town's starting Residence goes at setup. */
  residence: HexCoord
  /** The town's printed Station, beside its Residence and on the rail. */
  station: HexCoord
}

// Five town sites; the letter names the town.
export const TOWN_SITES = {
  A: { residence: [1, 2], station: [1, 3] },
  B: { residence: [5, 1], station: [5, 0] },
  C: { residence: [9, 2], station: [9, 3] },
  D: { residence: [1, 7], station: [2, 7] },
  E: { residence: [8, 7], station: [7, 6] },
} as const satisfies Record<string, TownSite>

export type TownId = keyof typeof TOWN_SITES

export const RAIL_LINES: readonly (readonly EdgeRef[])[] = [
  // From D's Station, north along the lakeshore, then east. Shares its [5, 3, 'SE'] edge
  // with the north-south line, which is where the two lines cross.
  [
    [1, 6, 'SE'], [1, 6, 'NE'], [1, 5, 'SE'], [1, 5, 'NE'], [1, 4, 'SE'],
    [1, 4, 'NE'], [1, 3, 'SE'], [2, 3, 'S'], [2, 3, 'SE'], [3, 2, 'S'],
    [3, 3, 'NE'], [4, 3, 'S'], [4, 4, 'NE'], [5, 3, 'S'], [5, 3, 'SE'],
    [6, 3, 'S'], [6, 4, 'NE'], [7, 3, 'S'], [7, 3, 'SE'], [8, 3, 'S'],
    [8, 4, 'NE'], [9, 3, 'S'], [9, 4, 'NE'], [10, 4, 'S'], [10, 4, 'SE'],
  ],
  // North to south.
  [
    [6, 0, 'NW'], [5, 0, 'NE'], [5, 0, 'SE'], [5, 1, 'NE'], [5, 1, 'SE'],
    [5, 2, 'NE'], [5, 2, 'SE'], [5, 3, 'NE'], [5, 3, 'SE'], [5, 4, 'NE'],
    [5, 4, 'SE'], [5, 5, 'NE'], [5, 5, 'SE'], [5, 6, 'NE'], [6, 6, 'S'],
    [6, 7, 'NE'], [7, 6, 'S'], [7, 7, 'NE'], [7, 7, 'SE'], [7, 8, 'NE'],
    [7, 8, 'SE'],
  ],
]

// From the northern mountains down to the lake at [2, 5]. Scenery: it divides nothing.
export const RIVER: readonly EdgeRef[] = [
  [1, 0, 'NE'], [2, 0, 'S'], [2, 1, 'NE'], [2, 1, 'SE'], [2, 2, 'NE'],
  [2, 2, 'SE'], [2, 3, 'NE'], [2, 3, 'SE'], [2, 4, 'NE'], [2, 4, 'SE'],
]
