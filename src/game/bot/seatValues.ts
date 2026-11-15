import type { HexKey } from '../map/hexGrid'
import type { TownId } from '../map/mapData'
import { cityAt, faceUpFactoriesIn, peopleAt, residencesInCity } from '../rules/boardQueries'
import { seatWinner } from '../rules/elections'
import type { CubeColor, PersonMove, PlayerColor, VotesState } from '../rules/types'

// How much a Residence's seat is worth to the bot, and how one person arriving or leaving
// changes that. A seat scores its holder 1 point per face-up Factory at the city's next
// election, so seats count for more in cities with Factories; a seat held by nobody at
// least isn't an opponent's.

/** An opponent's seat costs less than the bot's own is worth: it's shared out among several rivals. */
const OPPONENT_SEAT_VALUE = -0.5
/** Even a city without a face-up Factory will likely have one by its election. */
const BASE_CITY_WEIGHT = 1

export function seatValue(people: readonly CubeColor[], me: PlayerColor): number {
  const { winner } = seatWinner(people)
  if (winner === null) return 0
  return winner === me ? 1 : OPPONENT_SEAT_VALUE
}

/** How much the seats of the city holding `key` matter. */
export function cityWeight(state: VotesState, key: HexKey): number {
  return BASE_CITY_WEIGHT + faceUpFactoriesIn(state, cityAt(state, key))
}

/** `people` with the leftmost `color` gone, as when that colour leaves a Residence. */
function withoutOne(people: readonly CubeColor[], color: CubeColor): CubeColor[] {
  const index = people.indexOf(color)
  return people.filter((_, position) => position !== index)
}

function changeAt(state: VotesState, key: HexKey, after: readonly CubeColor[], me: PlayerColor): number {
  return (seatValue(after, me) - seatValue(peopleAt(state, key), me)) * cityWeight(state, key)
}

/** What a person of `color` settling in the Residence at `key` is worth to the bot. */
export function arrivalValue(state: VotesState, key: HexKey, color: CubeColor, me: PlayerColor): number {
  return changeAt(state, key, [...peopleAt(state, key), color], me)
}

/** What moving one person is worth to the bot: the seat it leaves and the seat it joins. */
export function personMoveValue(state: VotesState, { from, color, to }: PersonMove, me: PlayerColor): number {
  return changeAt(state, from, withoutOne(peopleAt(state, from), color), me) + arrivalValue(state, to, color, me)
}

/** The bot's seats in the city minus the most any one opponent holds there. */
export function seatLead(state: VotesState, city: TownId[], me: PlayerColor): number {
  const seatsByColor = new Map<PlayerColor, number>()
  for (const { tile } of residencesInCity(state, city)) {
    const { winner } = seatWinner(tile.people)
    if (winner) seatsByColor.set(winner, (seatsByColor.get(winner) ?? 0) + 1)
  }
  const mine = seatsByColor.get(me) ?? 0
  const rivals = [...seatsByColor].filter(([color]) => color !== me).map(([, seats]) => seats)
  return mine - Math.max(0, ...rivals)
}

/** The share of the city's people who are the bot's colour; 0 in an empty city. */
export function shareOfPeople(state: VotesState, city: TownId[], me: PlayerColor): number {
  const people = residencesInCity(state, city).flatMap(({ tile }) => tile.people)
  if (people.length === 0) return 0
  return people.filter(person => person === me).length / people.length
}
