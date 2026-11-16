import type { HexKey } from '../map/hexGrid'
import { cityAt } from '../rules/boardQueries'
import type { PlayerColor, TakeableKind, VotesMove, VotesState } from '../rules/types'
import { faceUpFactoryValue, newSeatValue, placementValue } from './placementValues'

// Rough worth of each action to the bot, in points it expects to gain over its rivals.
// Placing a tile is valued in placementValues.ts; taking and flipping here. Each is read
// straight off the board as it stands, never by playing moves out.

/** Taking a kind the bot has none of, so it can place one next turn. */
const TAKE_VALUE: Record<TakeableKind, number> = { factory: 0.6, school: 0.2, hub: 0.15, port: 0.5, hall: 0.3 }
/** Taking one more of a kind the bot already holds still keeps it from rivals. */
const TAKE_SPARE_VALUE = 0.05

/** A flipped Factory draws people and scores; a flipped Residence or University draws people in. */
function flipValue(state: VotesState, at: HexKey, me: PlayerColor): number {
  const tile = state.tiles[at]
  const city = cityAt(state, at)
  if (tile?.kind === 'factory') return faceUpFactoryValue(state, city, me, 'everyCity')
  return newSeatValue(state, city, me)
}

function takeValue(state: VotesState, kind: TakeableKind, me: PlayerColor): number {
  const player = state.players.find(candidate => candidate.color === me)
  return player && player.supply[kind] > 0 ? TAKE_SPARE_VALUE : TAKE_VALUE[kind]
}

/** What an action-phase move is worth to the bot. */
export function actionValue(state: VotesState, move: VotesMove, me: PlayerColor): number {
  switch (move.kind) {
    case 'take':
      return takeValue(state, move.tile, me)
    case 'place':
      return placementValue(state, move.tile, move.at, me)
    case 'flip':
      return flipValue(state, move.at, me)
    case 'pass':
      return 0
    case 'arrive':
    case 'move':
      throw new Error(`A ${move.kind} move isn't an action`)
  }
}
