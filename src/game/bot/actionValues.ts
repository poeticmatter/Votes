import type { HexKey } from '../map/hexGrid'
import type { TownId } from '../map/mapData'
import { bagSize, cityAt, citiesOf, crowdOf, faceUpFactoriesIn, residencesInCity } from '../rules/boardQueries'
import { seatWinner } from '../rules/elections'
import { citiesTouchedBy } from '../rules/mergers'
import { OVERCROWDED_AT, RESIDENCES_PER_FACTORY, type PlaceableKind, type PlayerColor, type TakeableKind, type VotesMove, type VotesState } from '../rules/types'
import { seatLead, shareOfPeople } from './seatValues'

// Rough worth of each action to the bot, in points it expects to gain over its rivals.
// Each is read straight off the board as it stands, never by playing moves out: a merger
// is worth the election it would hold now, a Factory flip the people the bag is likely to
// bring, and so on. The dials below are guesses, tuned only by watching bots play.

/** Ending the game outweighs any single election. */
const GAME_END_VALUE = 100
/** One of the bot's people settling on the board. */
const OWN_ARRIVAL_VALUE = 0.6
/** One of the bot's cubes going into the bag, to arrive some later turn. */
const BAG_CUBE_VALUE = 0.25
/** A Residence tile in the bot's supply. */
const RESIDENCE_TILE_VALUE = 0.25
/** A face-down Residence: a seat to come. */
const FACE_DOWN_RESIDENCE_VALUE = 0.1
/** Per seat of lead, for a face-down Factory: it will score for its city once flipped. */
const FACE_DOWN_FACTORY_LEAD_VALUE = 0.3
/** Per seat of lead, for a Factory flipped face up: every seat in its city scores 1 more. */
const FACE_UP_FACTORY_LEAD_VALUE = 0.5
const SCHOOL_VALUE = 0.2
const SCHOOL_LEAD_VALUE = 0.2
/** A flipped Residence or University draws people in; the bot hopes they're its own. */
const DRAW_PEOPLE_IN_VALUE = 0.2
const DRAW_PEOPLE_IN_SHARE_VALUE = 0.4
/** Taking a kind the bot has none of, so it can place one next turn. */
const TAKE_VALUE: Record<TakeableKind, number> = { factory: 0.6, school: 0.2 }
/** Taking one more of a kind the bot already holds still keeps it from rivals. */
const TAKE_SPARE_VALUE = 0.05

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)

/** Every city a tile at `at` would join together, its own first. */
function citiesJoinedAt(state: VotesState, at: HexKey): TownId[][] {
  const { own, joins } = citiesTouchedBy(state, at)
  return [own, ...joins.map(join => join.city)]
}

/**
 * The points each player would score from the election a tile at `at` would hold, as
 * the seats stand now. A School placed there would move people first; that's ignored.
 */
function mergerPoints(state: VotesState, cities: TownId[][]): Map<PlayerColor, number> {
  const perSeat = sum(cities.map(city => faceUpFactoriesIn(state, city)))
  const points = new Map<PlayerColor, number>()
  for (const { tile } of cities.flatMap(city => residencesInCity(state, city))) {
    const { winner } = seatWinner(tile.people)
    if (winner) points.set(winner, (points.get(winner) ?? 0) + perSeat)
  }
  return points
}

/** A merger is worth what the bot scores minus what its best rival does; the last one, whether the bot wins. */
function mergerValue(state: VotesState, at: HexKey, me: PlayerColor): number {
  const cities = citiesJoinedAt(state, at)
  if (cities.length < 2) return 0
  const points = mergerPoints(state, cities)
  const isLastMerger = citiesOf(state).length - (cities.length - 1) === 1
  if (isLastMerger) {
    const finalScores = state.players.map(player => ({ color: player.color, score: player.score + (points.get(player.color) ?? 0) }))
    const best = Math.max(...finalScores.map(({ score }) => score))
    return finalScores.some(({ color, score }) => color === me && score === best) ? GAME_END_VALUE : -GAME_END_VALUE
  }
  const rivalBest = Math.max(0, ...[...points].filter(([color]) => color !== me).map(([, gained]) => gained))
  return (points.get(me) ?? 0) - rivalBest
}

/** A face-down Residence adds 1 of the bot's cubes to the bag per overcrowded Residence in its city, merged or not. */
function residencePlacementValue(state: VotesState, at: HexKey): number {
  const cities = citiesJoinedAt(state, at)
  const overcrowded = cities
    .flatMap(city => residencesInCity(state, city))
    .filter(({ key }) => crowdOf(state, key) >= OVERCROWDED_AT).length
  return FACE_DOWN_RESIDENCE_VALUE + overcrowded * BAG_CUBE_VALUE
}

function placementValue(state: VotesState, kind: PlaceableKind, at: HexKey, me: PlayerColor): number {
  const [own] = citiesJoinedAt(state, at)
  const merger = mergerValue(state, at, me)
  if (kind === 'residence') return merger + residencePlacementValue(state, at)
  if (kind === 'factory') {
    const residencesGained = Math.min(RESIDENCES_PER_FACTORY, state.supply.residence)
    return merger + residencesGained * RESIDENCE_TILE_VALUE + seatLead(state, own, me) * FACE_DOWN_FACTORY_LEAD_VALUE
  }
  return merger + SCHOOL_VALUE + seatLead(state, own, me) * SCHOOL_LEAD_VALUE
}

/** A flipped Factory draws a person per city: some may be the bot's, and each adds one of its cubes to the bag. */
function factoryFlipValue(state: VotesState, city: TownId[], me: PlayerColor): number {
  const inBag = bagSize(state)
  const arrivals = Math.min(citiesOf(state).length, inBag)
  const ownShare = inBag === 0 ? 0 : (state.bag[me] ?? 0) / inBag
  const peopleValue = arrivals * (ownShare * OWN_ARRIVAL_VALUE + BAG_CUBE_VALUE)
  return peopleValue + seatLead(state, city, me) * FACE_UP_FACTORY_LEAD_VALUE
}

function flipValue(state: VotesState, at: HexKey, me: PlayerColor): number {
  const tile = state.tiles[at]
  const city = cityAt(state, at)
  if (tile?.kind === 'factory') return factoryFlipValue(state, city, me)
  return DRAW_PEOPLE_IN_VALUE + shareOfPeople(state, city, me) * DRAW_PEOPLE_IN_SHARE_VALUE
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
