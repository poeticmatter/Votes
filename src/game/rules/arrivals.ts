import type { HexKey } from '../map/hexGrid'
import type { TownId } from '../map/mapData'
import { drawFromBag } from './bag'
import { bagSize, residencesInCity } from './boardQueries'
import { FACTORY_DRAW, type CubeColor, type VotesState } from './types'

// Cubes come out of the bag two ways:
// - A placed Factory draws 5 cubes onto itself, or as many as the bag holds.
// - After a merger's election, each Residence of the merged city draws 1 person, in board
//   order, until the bag runs out.

/** The Factory just placed at `at` draws its cubes from the bag. */
export function stockFactory(state: VotesState, at: HexKey): VotesState {
  const count = Math.min(FACTORY_DRAW, bagSize(state))
  let current = state
  const drawn: CubeColor[] = []
  for (let index = 0; index < count; index += 1) {
    const result = drawFromBag(current)
    current = result.state
    drawn.push(result.color)
  }
  const tile = current.tiles[at]
  if (tile?.kind !== 'factory') throw new Error(`Expected a Factory at ${at}`)
  const entry = { kind: 'stocked' as const, turn: state.turn.number, at, count }
  return { ...current, tiles: { ...current.tiles, [at]: { ...tile, cubes: [...tile.cubes, ...drawn] } }, log: [...current.log, entry] }
}

function drawInto(state: VotesState, residence: HexKey): VotesState {
  const { state: drawn, color } = drawFromBag(state)
  const tile = drawn.tiles[residence]
  if (tile?.kind !== 'residence') throw new Error(`Expected a Residence at ${residence}`)
  const entry = { kind: 'arrived' as const, turn: state.turn.number, color, residence }
  return { ...drawn, tiles: { ...drawn.tiles, [residence]: { ...tile, people: [...tile.people, color] } }, log: [...drawn.log, entry] }
}

/** After a merger's election: 1 person from the bag into each of the city's Residences, in board order, while the bag lasts. */
export function mergerArrivals(state: VotesState, city: TownId[]): VotesState {
  return residencesInCity(state, city).reduce((current, { key }) => (bagSize(current) === 0 ? current : drawInto(current, key)), state)
}
