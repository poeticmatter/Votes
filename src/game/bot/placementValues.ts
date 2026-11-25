import type { HexKey } from '../map/hexGrid'
import type { TownId } from '../map/mapData'
import { bagSize, citiesOf, factoryCountIn, residencesInCity } from '../rules/boardQueries'
import { seatWinner } from '../rules/elections'
import { citiesTouchedBy } from '../rules/mergers'
import { FACTORY_DRAW, type PlaceableKind, type PlayerColor, type VotesState } from '../rules/types'
import { seatLead, shareOfPeople } from './seatValues'

// Rough worth to the bot of placing a tile, in points it expects to gain over its rivals,
// read straight off the board as it stands: a merger is worth the election it would hold
// now, a Residence the seat it can pull people into, and so on. The dials are guesses,
// tuned only by watching bots play.

/** Ending the game outweighs any single election. */
const GAME_END_VALUE = 100
/** One of the bot's cubes going into the bag, to arrive some later turn. */
export const BAG_CUBE_VALUE = 0.25
/** A Residence of the bot's own: a seat only it can pull people into. */
const OWN_SEAT_VALUE = 0.6
const OWN_SEAT_SHARE_VALUE = 0.4
/** A Factory's cubes feed Residences, and each one pulled out puts a cube of the bot's in the bag. */
const FACTORY_CUBE_VALUE = 0.1
/** Per seat of lead, for a Factory: every seat in its city scores 1 more. */
const FACTORY_LEAD_VALUE = 0.5
/** A School lets the city pull from everywhere, and pays its owner a cube for each person who comes. */
const SCHOOL_VALUE = 0.4
const SCHOOL_LEAD_VALUE = 0.2

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)

/** Every city a tile at `at` would join together, its own first. */
function citiesJoinedAt(state: VotesState, at: HexKey): TownId[][] {
  const { own, joins } = citiesTouchedBy(state, at)
  return [own, ...joins.map(join => join.city)]
}

/** The points each player would score from the election the cities would hold, as the seats stand now. */
function mergerPoints(state: VotesState, cities: TownId[][], addedFactories: number): Map<PlayerColor, number> {
  const perSeat = addedFactories + sum(cities.map(city => factoryCountIn(state, city)))
  const points = new Map<PlayerColor, number>()
  for (const { tile } of cities.flatMap(city => residencesInCity(state, city))) {
    const { winner } = seatWinner(tile.people)
    if (winner) points.set(winner, (points.get(winner) ?? 0) + perSeat)
  }
  return points
}

/** A merger is worth what the bot scores minus what its best rival does; the last one, whether the bot wins. */
function mergerValue(state: VotesState, cities: TownId[][], me: PlayerColor, addedFactories: number): number {
  if (cities.length < 2) return 0
  const points = mergerPoints(state, cities, addedFactories)
  const isLastMerger = citiesOf(state).length - (cities.length - 1) === 1
  if (isLastMerger) {
    const finalScores = state.players.map(player => ({ color: player.color, score: player.score + (points.get(player.color) ?? 0) }))
    const best = Math.max(...finalScores.map(({ score }) => score))
    return finalScores.some(({ color, score }) => color === me && score === best) ? GAME_END_VALUE : -GAME_END_VALUE
  }
  const rivalBest = Math.max(0, ...[...points].filter(([color]) => color !== me).map(([, gained]) => gained))
  const seatsWon = (points.get(me) ?? 0) > 0 ? 1 : 0
  return (points.get(me) ?? 0) - rivalBest + seatsWon * BAG_CUBE_VALUE
}

function tileValue(state: VotesState, kind: PlaceableKind, city: TownId[], me: PlayerColor): number {
  switch (kind) {
    case 'residence':
      return OWN_SEAT_VALUE + shareOfPeople(state, city, me) * OWN_SEAT_SHARE_VALUE
    case 'factory':
      return Math.min(FACTORY_DRAW, bagSize(state)) * FACTORY_CUBE_VALUE + seatLead(state, city, me) * FACTORY_LEAD_VALUE
    case 'school':
      return SCHOOL_VALUE + seatLead(state, city, me) * SCHOOL_LEAD_VALUE
  }
}

/** What placing a tile of `kind` at `at` is worth to the bot. */
export function placementValue(state: VotesState, kind: PlaceableKind, at: HexKey, me: PlayerColor): number {
  const cities = citiesJoinedAt(state, at)
  return mergerValue(state, cities, me, kind === 'factory' ? 1 : 0) + tileValue(state, kind, cities[0], me)
}
