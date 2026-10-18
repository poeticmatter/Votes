import { drawFromBag } from './bag'
import { bagSize, stationOf } from './boardQueries'
import type { CubeColor, VotesState } from './types'

// Immigration: a new Factory draws people from the bag onto its town's Station, where
// they wait to be housed. Nobody pays for a draw, so the bag can run low; once it's
// empty nobody else arrives.

/** Runs this turn's immigration. It needs no decisions. */
export function immigrate(state: VotesState): VotesState {
  const at = state.turn.placedAt
  const tile = at ? state.tiles[at] : undefined
  if (tile?.kind !== 'factory') return state

  const station = stationOf(state, tile.town)
  let current = state
  const arrived: CubeColor[] = []
  while (arrived.length < state.factoryArrivals && bagSize(current) > 0) {
    const draw = drawFromBag(current)
    current = draw.state
    arrived.push(draw.color)
  }
  if (arrived.length === 0) return state

  return {
    ...current,
    tiles: { ...current.tiles, [station.key]: { ...station.tile, people: [...station.tile.people, ...arrived] } },
    log: [...current.log, { kind: 'arrived', turn: state.turn.number, station: station.key, town: tile.town, people: arrived }],
  }
}
