import { DISTRICT_IDS, districtOf } from '../map/board'
import type { DistrictId } from '../map/mapData'
import { factoryKeys, factoryPoints, residencesIn, turnOrderColors, votingResidencesIn } from './boardQueries'
import {
  INDEPENDENT,
  type CityElection,
  type CubeColor,
  type DistrictElection,
  type ElectionResult,
  type PlayerColor,
  type SeatAward,
  type VotesState,
} from './types'

// Elections, held after every merger. Every Residence adds a seat to its district, but
// only families in Residences next to a School vote for them. Seat allocation follows
// the asset generator's src/rules/elections.js, with two differences for cases it never
// meets on paper:
// a colour with no cubes left can't win a seat as the compromise candidate, and seats
// that no remaining cube can fill stay empty instead of being an error.

type Tally = { color: CubeColor; count: number }

const highestCount = (tallies: Tally[]) => Math.max(...tallies.map(tally => tally.count))

function pickSeatWinner(tallies: Tally[], lastWinner: CubeColor | null, turnOrder: CubeColor[]): SeatAward {
  const top = highestCount(tallies)
  const tied = tallies.filter(tally => tally.count === top)
  if (tied.length === 1) return { color: tied[0].color, reason: 'mostCubes' }

  const freshTied = tied.filter(tally => tally.color !== lastWinner)
  if (freshTied.length === 1) return { color: freshTied[0].color, reason: 'didNotTakeLastSeat' }

  const outsiders = tallies.filter(tally => tally.count < top)
  if (outsiders.length) {
    const largest = outsiders.filter(tally => tally.count === highestCount(outsiders))
    if (largest.length === 1) return { color: largest[0].color, reason: 'compromise' }
  }

  // At least two colours are still tied and at most one is grey, so a player is among them.
  const color = turnOrder.find(candidate => freshTied.some(tally => tally.color === candidate))
  if (!color) throw new Error(`No player among tied colours ${freshTied.map(tally => tally.color).join(', ')}`)
  return { color, reason: 'playerOrder' }
}

/**
 * Awards seats one at a time: the colour with the most cubes takes a seat, then counts
 * one fewer. `turnOrder` settles ties that nothing else does.
 */
export function awardSeats(
  voters: Partial<Record<CubeColor, number>>,
  seatCount: number,
  turnOrder: CubeColor[],
): SeatAward[] {
  let tallies: Tally[] = [INDEPENDENT, ...turnOrder].map(color => ({ color, count: voters[color] ?? 0 }))
  let lastWinner: CubeColor | null = null
  const awards: SeatAward[] = []
  for (let seat = 0; seat < seatCount; seat += 1) {
    const contenders = tallies.filter(tally => tally.count > 0)
    if (contenders.length === 0) break
    const award = pickSeatWinner(contenders, lastWinner, turnOrder)
    awards.push(award)
    tallies = tallies.map(tally => (tally.color === award.color ? { ...tally, count: tally.count - 1 } : tally))
    lastWinner = award.color
  }
  return awards
}

function countByColor(colors: CubeColor[]): Partial<Record<CubeColor, number>> {
  return colors.reduce<Partial<Record<CubeColor, number>>>(
    (counts, color) => ({ ...counts, [color]: (counts[color] ?? 0) + 1 }),
    {},
  )
}

function electDistrict(state: VotesState, district: DistrictId): DistrictElection {
  const seatCount = residencesIn(state, district).length
  const voters = countByColor(votingResidencesIn(state, district).flatMap(({ tile }) => tile.families))
  return {
    district,
    seatCount,
    voters,
    awards: awardSeats(voters, seatCount, turnOrderColors(state)),
  }
}

/**
 * The players with the most seats score, all of them on a tie. Nobody scores when no
 * player holds a seat or when grey holds more seats than any player.
 */
export function cityScorers(seats: Partial<Record<CubeColor, number>>, players: PlayerColor[]): PlayerColor[] {
  const mostPlayerSeats = Math.max(0, ...players.map(color => seats[color] ?? 0))
  if (mostPlayerSeats === 0 || (seats[INDEPENDENT] ?? 0) > mostPlayerSeats) return []
  return players.filter(color => (seats[color] ?? 0) === mostPlayerSeats)
}

function electCity(state: VotesState, city: DistrictId[], districtResults: DistrictElection[]): CityElection {
  const awards = districtResults.filter(result => city.includes(result.district)).flatMap(result => result.awards)
  const seats = countByColor(awards.map(award => award.color))
  const factoryPointsInCity = factoryKeys(state)
    .filter(key => city.includes(districtOf(key)))
    .reduce((total, key) => total + factoryPoints(key), 0)
  return {
    districts: city,
    seats,
    factoryPoints: factoryPointsInCity,
    scorers: cityScorers(seats, state.players.map(player => player.color)),
  }
}

/** Counts the votes as the board stands. Doesn't change any scores. */
export function countVotes(state: VotesState): ElectionResult {
  const districts = DISTRICT_IDS.map(district => electDistrict(state, district))
  return {
    number: state.elections.length + 1,
    turn: state.turn.number,
    districts,
    cities: state.cities.map(city => electCity(state, city, districts)),
  }
}

export function holdElection(state: VotesState): VotesState {
  const result = countVotes(state)
  const pointsByColor = new Map<PlayerColor, number>()
  for (const city of result.cities) {
    for (const scorer of city.scorers) pointsByColor.set(scorer, (pointsByColor.get(scorer) ?? 0) + city.factoryPoints)
  }
  return {
    ...state,
    players: state.players.map(player => ({ ...player, score: player.score + (pointsByColor.get(player.color) ?? 0) })),
    elections: [...state.elections, result],
  }
}
