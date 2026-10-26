import { describe, expect, it } from 'vitest'
import { IllegalMoveError } from 'game-kit/turns'
import { hexAt, TOWN_IDS } from '../map/board'
import { applyMove } from './turnFlow'
import { hexTouchingOnly, must, schoolLayout, soloNeighborsOf, startOf, stationOf } from './testMap'
import { newGame, residence, school, station, withTiles } from './testStates'
import type { CubeColor, VotesState } from './types'

// A School at `school` touches the town's starting Residence and a second Residence at
// `residence`; `rival` is where a second School would touch only the second Residence.
// Pink is the active player. The town is whichever the map lays this out in.
const { town, school: SCHOOL, residence: NEW, rival: RIVAL } = schoolLayout()
const START = startOf(town)

const touches = (a: string, b: string) => hexAt(a).neighbors.some(neighbor => neighbor.key === b)

/** A free hex beside some town's tiles, off the rail and clear of both Schools: a Residence there may lose a person. */
const SOURCE = must(
  TOWN_IDS.flatMap(soloNeighborsOf).find(
    key => !hexAt(key).bordersRail && ![SCHOOL, NEW, RIVAL].includes(key) && !touches(key, SCHOOL) && !touches(key, RIVAL),
  ),
  'hex off the rail and clear of the Schools',
)
/** A starting Residence beside the rail and clear of the School, which a School may not take from. */
const RAILSIDE = must(
  TOWN_IDS.map(startOf).find(key => hexAt(key).bordersRail && !touches(key, SCHOOL) && !touches(key, RIVAL)),
  'starting Residence beside the rail and clear of the School',
)

const board = withTiles(newGame(), {
  [START]: residence(['grey', 'grey', 'vermillion']),
  [NEW]: residence(['vermillion']),
  [SOURCE]: residence(['pink', 'grey']),
})
const placeSchool = (state: VotesState, at = SCHOOL) => applyMove(state, { kind: 'place', tile: 'school', at })
const relocating = placeSchool(board)

const relocate = (state: VotesState, from: string, color: CubeColor, to: string) =>
  applyMove(state, { kind: 'relocate', from, color, to })

describe('a School’s relocation', () => {
  it('offers each Residence next to the School', () => {
    expect(relocating.phase.kind === 'relocation' && [...relocating.phase.residences].sort()).toEqual([START, NEW].sort())
  })

  it('leaves out a Residence that touches another School', () => {
    const withRival = placeSchool(withTiles(board, { [RIVAL]: school() }))
    expect(withRival.phase).toEqual({ kind: 'relocation', residences: [START] })
  })

  it('moves a person into a Residence even when it’s full', () => {
    const state = relocate(relocating, SOURCE, 'pink', START)
    expect(state.tiles[START]).toEqual(residence(['grey', 'grey', 'vermillion', 'pink']))
  })

  it('takes the person from where the player chose', () => {
    const state = relocate(relocating, SOURCE, 'pink', START)
    expect(state.tiles[SOURCE]).toEqual(residence(['grey']))
  })

  it('moves only the one person, then the turn goes on', () => {
    expect(relocate(relocating, SOURCE, 'pink', START).turn.playerIndex).toBe(1)
  })

  it('adds a cube to the bag for the person moved', () => {
    const state = relocate(relocating, SOURCE, 'pink', START)
    expect(state.bag.pink).toBe((board.bag.pink ?? 0) + 1)
  })

  it('records the move as a relocated entry', () => {
    const entry = relocate(relocating, SOURCE, 'pink', START).log.at(-1)
    expect(entry).toMatchObject({ kind: 'relocated', from: SOURCE, to: START, color: 'pink', voter: 'pink' })
  })

  it('refuses a person from a Residence that touches a School', () => {
    expect(() => relocate(relocating, NEW, 'vermillion', START)).toThrow(IllegalMoveError)
  })

  it('refuses a person from a Residence beside the rail', () => {
    const railside = placeSchool(withTiles(board, { [RAILSIDE]: residence(['grey']) }))
    expect(() => relocate(railside, RAILSIDE, 'grey', START)).toThrow(IllegalMoveError)
  })

  it('refuses a person waiting at a Station', () => {
    const waiting = placeSchool(withTiles(board, { [stationOf(town)]: station(['grey']) }))
    expect(() => relocate(waiting, stationOf(town), 'grey', NEW)).toThrow(IllegalMoveError)
  })

  it('refuses a Residence the School doesn’t touch', () => {
    expect(() => relocate(relocating, SOURCE, 'pink', RAILSIDE)).toThrow(IllegalMoveError)
  })

  it('moves nobody when no Residence may lose a person', () => {
    expect(placeSchool(withTiles(board, { [SOURCE]: residence() })).turn.playerIndex).toBe(1)
  })

  it('moves nobody for a School with no Residence to fill', () => {
    // This hex touches the town's Station and nothing else.
    expect(placeSchool(newGame(), hexTouchingOnly(stationOf(town))).turn.playerIndex).toBe(1)
  })
})
