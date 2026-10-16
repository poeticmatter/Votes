import { districtOf } from '../map/board'
import type { HexKey } from '../map/hexGrid'
import { addToBag, drawFromBag } from './bag'
import { bagSize, stations } from './boardQueries'
import type { CubeColor, VotesState } from './types'

// Immigration: people drawn from the bag arrive by train and wait at a Station. A new
// Station brings people to itself; a new Factory brings them to every Station in its
// district. For each person drawn, the Station's owner adds one of their own cubes to
// the bag straight away, so the bag never shrinks: only a bag that starts empty (an
// extreme setting of the dials) can leave people out.

interface Arrival {
  station: HexKey
  count: number
}

/** Where this turn's tile brings people, and how many to each Station. */
function arrivalsForPlacedTile(state: VotesState): Arrival[] {
  const at = state.turn.placedAt
  const tile = at ? state.tiles[at] : undefined
  if (!at || !tile) return []
  if (tile.kind === 'station') return [{ station: at, count: state.arrivals.perStation }]
  if (tile.kind !== 'factory') return []
  const district = districtOf(at)
  return stations(state)
    .filter(({ key }) => districtOf(key) === district)
    .map(({ key }) => ({ station: key, count: state.arrivals.perFactory }))
}

function arriveAt(state: VotesState, { station, count }: Arrival): VotesState {
  const tile = state.tiles[station]
  if (tile?.kind !== 'station') throw new Error(`Expected a Station at ${station}`)

  let current = state
  const arrived: CubeColor[] = []
  while (arrived.length < count && bagSize(current) > 0) {
    const draw = drawFromBag(current)
    current = addToBag(draw.state, tile.owner, 1)
    arrived.push(draw.color)
  }
  if (arrived.length === 0) return state

  return {
    ...current,
    tiles: { ...current.tiles, [station]: { ...tile, people: [...tile.people, ...arrived] } },
    log: [...current.log, { kind: 'arrived', turn: state.turn.number, station, owner: tile.owner, people: arrived }],
  }
}

/** Runs this turn's immigration. It needs no decisions. */
export function immigrate(state: VotesState): VotesState {
  return arrivalsForPlacedTile(state).reduce(arriveAt, state)
}
