import type { HexKey } from '../map/hexGrid'
import type { TownId } from '../map/mapData'
import { bagSize, cityAt, citiesOf, crowdOf, faceUpFactoriesIn, residencesInCity, tilesInBoardOrder } from '../rules/boardQueries'
import { seatWinner } from '../rules/elections'
import { citiesTouchedBy } from '../rules/mergers'
import { OVERCROWDED_AT, RESIDENCES_PER_FACTORY, type FactoryArrivals, type PlaceableKind, type PlayerColor, type VotesState } from '../rules/types'
import { seatLead, shareOfPeople } from './seatValues'

// Rough worth to the bot of placing a tile, in points it expects to gain over its rivals,
// read straight off the board as it stands: a merger is worth the election it would hold
// now, a Port the people the bag is likely to bring, and so on. The dials are guesses,
// tuned only by watching bots play.

/** Ending the game outweighs any single election. */
const GAME_END_VALUE = 100
/** One of the bot's people settling on the board. */
const OWN_ARRIVAL_VALUE = 0.6
/** One of the bot's cubes going into the bag, to arrive some later turn. */
export const BAG_CUBE_VALUE = 0.25
/** A Residence tile in the bot's supply. */
const RESIDENCE_TILE_VALUE = 0.25
/** A face-down Residence: a seat to come. */
const FACE_DOWN_RESIDENCE_VALUE = 0.1
/** Per seat of lead, for a face-down Factory: it will score for its city once flipped. */
const FACE_DOWN_FACTORY_LEAD_VALUE = 0.3
/** Per seat of lead, for a Factory face up: every seat in its city scores 1 more. */
const FACE_UP_FACTORY_LEAD_VALUE = 0.5
/** A new face-up Residence (flipped, or placed face up) draws people in; the bot hopes they're its own. */
const NEW_SEAT_VALUE = 0.2
const NEW_SEAT_SHARE_VALUE = 0.4
const SCHOOL_VALUE = 0.2
const SCHOOL_LEAD_VALUE = 0.2
/** A first Hub is a bet that another will join it; joined to another Hub city it lets crowds spread between them. */
const HUB_VALUE = 0.3
const HUB_LINK_VALUE = 0.3

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)

/** A proposed Factory brings this many people for its own city. */
const OWN_CITY_ARRIVALS = 2

/**
 * What drawing `count` people from the bag is worth: some may be the bot's, and each may
 * add one of its cubes to the bag. Where they settle is left to the arrival itself.
 */
function drawValue(state: VotesState, count: number, me: PlayerColor): number {
  const inBag = bagSize(state)
  const arrivals = Math.min(count, inBag)
  const ownShare = inBag === 0 ? 0 : (state.bag[me] ?? 0) / inBag
  const voteValue = state.options.arrivalsAddCubes ? BAG_CUBE_VALUE : 0
  return arrivals * (ownShare * OWN_ARRIVAL_VALUE + voteValue)
}

/** Drawing a person for every city (a Factory flip or a Port). */
export function drawForEveryCityValue(state: VotesState, me: PlayerColor): number {
  return drawValue(state, citiesOf(state).length, me)
}

function factoryArrivalsValue(state: VotesState, arrivals: FactoryArrivals, me: PlayerColor): number {
  switch (arrivals) {
    case 'none':
      return 0
    case 'everyCity':
      return drawForEveryCityValue(state, me)
    case 'ownCity':
      return drawValue(state, OWN_CITY_ARRIVALS, me)
  }
}

/** A Residence turning face up in `city`: a new seat, which levelling may fill. */
export function newSeatValue(state: VotesState, city: TownId[], me: PlayerColor): number {
  return NEW_SEAT_VALUE + shareOfPeople(state, city, me) * NEW_SEAT_SHARE_VALUE
}

/** A Factory turning face up in `city`: it scores for every seat there, and may bring people. */
export function faceUpFactoryValue(state: VotesState, city: TownId[], me: PlayerColor, arrivals: FactoryArrivals): number {
  return factoryArrivalsValue(state, arrivals, me) + seatLead(state, city, me) * FACE_UP_FACTORY_LEAD_VALUE
}

/** Every city a tile at `at` would join together, its own first. */
function citiesJoinedAt(state: VotesState, at: HexKey): TownId[][] {
  const { own, joins } = citiesTouchedBy(state, at)
  return [own, ...joins.map(join => join.city)]
}

/**
 * The points each player would score from the election a tile at `at` would hold, as
 * the seats stand now. A tile that moves people first (a School, Hub or Port) is valued
 * as though they stayed put.
 */
function mergerPoints(state: VotesState, cities: TownId[][], addedFactories = 0): Map<PlayerColor, number> {
  const perSeat = addedFactories + sum(cities.map(city => faceUpFactoriesIn(state, city)))
  const points = new Map<PlayerColor, number>()
  for (const { tile } of cities.flatMap(city => residencesInCity(state, city))) {
    const { winner } = seatWinner(tile.people)
    if (winner) points.set(winner, (points.get(winner) ?? 0) + perSeat)
  }
  return points
}

/** An election is worth what the bot scores minus what its best rival does. */
function electionValue(state: VotesState, cities: TownId[][], me: PlayerColor, addedFactories = 0): number {
  const points = mergerPoints(state, cities, addedFactories)
  const rivalBest = Math.max(0, ...[...points].filter(([color]) => color !== me).map(([, gained]) => gained))
  return (points.get(me) ?? 0) - rivalBest
}

/**
 * A merger is worth its election; the last one, whether the bot wins. `addedFactories`
 * counts a Factory placed face up by the merging tile itself.
 */
function mergerValue(state: VotesState, cities: TownId[][], me: PlayerColor, addedFactories: number): number {
  if (cities.length < 2) return 0
  const points = mergerPoints(state, cities, addedFactories)
  const isLastMerger = citiesOf(state).length - (cities.length - 1) === 1
  if (isLastMerger) {
    const finalScores = state.players.map(player => ({ color: player.color, score: player.score + (points.get(player.color) ?? 0) }))
    const best = Math.max(...finalScores.map(({ score }) => score))
    return finalScores.some(({ color, score }) => color === me && score === best) ? GAME_END_VALUE : -GAME_END_VALUE
  }
  return electionValue(state, cities, me, addedFactories)
}

/** Draft 5.13's promises: a Residence's cube per overcrowded Residence in its city, a Factory's Residence tiles. */
function promiseValue(state: VotesState, kind: PlaceableKind, cities: TownId[][]): number {
  if (kind === 'factory') return Math.min(RESIDENCES_PER_FACTORY, state.supply.residence) * RESIDENCE_TILE_VALUE
  if (kind !== 'residence') return 0
  const overcrowded = cities
    .flatMap(city => residencesInCity(state, city))
    .filter(({ key }) => crowdOf(state, key) >= OVERCROWDED_AT).length
  return overcrowded * BAG_CUBE_VALUE
}

/** The cubes a tile adds to the bag when placed, by the cubes-per-tile rule or 5.13's promises. */
function bagValue(state: VotesState, kind: PlaceableKind, cities: TownId[][]): number {
  const { bagCubesOnPlace } = state.options
  return bagCubesOnPlace ? bagCubesOnPlace[kind] * BAG_CUBE_VALUE : promiseValue(state, kind, cities)
}

function hasHubOutside(state: VotesState, city: TownId[]): boolean {
  return tilesInBoardOrder(state).some(({ key, tile }) => tile.kind === 'hub' && cityAt(state, key)[0] !== city[0])
}

/** What the tile itself does, apart from the bag and any merger. */
function tileEffectValue(state: VotesState, kind: PlaceableKind, own: TownId[], me: PlayerColor): number {
  switch (kind) {
    case 'residence':
      return state.options.isPlaceOnly ? newSeatValue(state, own, me) : FACE_DOWN_RESIDENCE_VALUE
    case 'factory':
      return state.options.isPlaceOnly
        ? faceUpFactoryValue(state, own, me, state.options.factoryArrivals)
        : seatLead(state, own, me) * FACE_DOWN_FACTORY_LEAD_VALUE
    case 'school':
      return SCHOOL_VALUE + seatLead(state, own, me) * SCHOOL_LEAD_VALUE
    case 'hub':
      return HUB_VALUE + (hasHubOutside(state, own) ? HUB_LINK_VALUE : 0)
    case 'port':
      return drawForEveryCityValue(state, me)
    case 'hall':
      return 0
  }
}

/** What placing a tile of `kind` at `at` is worth to the bot. */
export function placementValue(state: VotesState, kind: PlaceableKind, at: HexKey, me: PlayerColor): number {
  const cities = citiesJoinedAt(state, at)
  // A Town Hall that joins nothing has its own city vote, valued like a merger's election.
  const addedFactories = kind === 'factory' && state.options.isPlaceOnly ? 1 : 0
  const election = kind === 'hall' && cities.length === 1 ? electionValue(state, cities, me) : mergerValue(state, cities, me, addedFactories)
  return election + tileEffectValue(state, kind, cities[0], me) + bagValue(state, kind, cities)
}
