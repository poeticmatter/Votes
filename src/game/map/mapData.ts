import type { EdgeRef, HexCoord } from './hexGrid'

// The printed map, ported from the asset generator (C:\Code\assets\VotesAssets,
// src/map/mapData.js). This is the only place map content lives: districts and rail
// adjacency are derived from it in board.ts, so a map change is an edit here, made in
// the asset generator first.
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
  [0, 8], [10, 0], [10, 8],
]

// One printed Residence per district; its letter names the district.
export const STARTING_RESIDENCES = {
  A: [1, 2],
  B: [5, 1],
  C: [9, 2],
  D: [2, 7],
  E: [8, 7],
} as const satisfies Record<string, HexCoord>

export type DistrictId = keyof typeof STARTING_RESIDENCES

// Public Factories on the map at setup, both in district E.
export const STARTING_FACTORIES: readonly HexCoord[] = [
  [9, 7], [10, 7],
]

export const RAIL_LINES: readonly (readonly EdgeRef[])[] = [
  // West to east. Shares its [5, 3, 'SE'] edge with the north-south line, which is
  // where the two lines cross.
  [
    [0, 4, 'SW'], [0, 4, 'S'], [0, 4, 'SE'], [1, 3, 'S'], [1, 3, 'SE'],
    [2, 3, 'S'], [2, 3, 'SE'], [3, 2, 'S'], [3, 3, 'NE'], [4, 3, 'S'],
    [4, 4, 'NE'], [5, 3, 'S'], [5, 3, 'SE'], [6, 3, 'S'], [6, 4, 'NE'],
    [7, 3, 'S'], [7, 3, 'SE'], [8, 3, 'S'], [8, 4, 'NE'], [9, 3, 'S'],
    [9, 4, 'NE'], [10, 4, 'S'], [10, 4, 'SE'],
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

// From the northern mountains down to the lake at [2, 5]. Its last two edges run
// inside district D, which wraps around the lakes, so they divide nothing.
export const RIVER: readonly EdgeRef[] = [
  [1, 0, 'NE'], [2, 0, 'S'], [2, 1, 'NE'], [2, 1, 'SE'], [2, 2, 'NE'],
  [2, 2, 'SE'], [2, 3, 'NE'], [2, 3, 'SE'], [2, 4, 'NE'], [2, 4, 'SE'],
]
