import type { TownId } from '../map/mapData'
import { addToBag } from './bag'
import { factoryCountIn, residencesInCity } from './boardQueries'
import { INDEPENDENT, PLAYER_COLORS, type CubeColor, type ElectionResult, type PlayerColor, type SeatResult, type VotesState } from './types'

// Elections, held after every merger by the newly merged city only. Every Residence is
// a seat. Grey people live there but never vote: the player colour with the most people
// on it wins, and a tie goes to the tied colour furthest left, the one that has lived
// there longest (people sit in a row, newcomers on the right). A Residence where nobody
// votes, empty or all grey, is nobody's. Every seat scores its holder 1 point per Factory
// in the city, and seats nobody holds score for nobody.

export type ColorCounts = Partial<Record<CubeColor, number>>

export function countByColor(colors: readonly CubeColor[]): ColorCounts {
  return colors.reduce<ColorCounts>((counts, color) => ({ ...counts, [color]: (counts[color] ?? 0) + 1 }), {})
}

const isVoter = (color: CubeColor): color is PlayerColor => color !== INDEPENDENT

export function seatWinner(people: readonly CubeColor[]): Pick<SeatResult, 'winner' | 'reason'> {
  const voters = people.filter(isVoter)
  if (voters.length === 0) return { winner: null, reason: 'noVoters' }
  const counts = countByColor(voters)
  const top = Math.max(...Object.values(counts).map(count => count ?? 0))
  // Colours are listed in the order they first appear, so the first leader is the leftmost.
  const leaders = [...new Set(voters)].filter(color => counts[color] === top)
  return { winner: leaders[0], reason: leaders.length === 1 ? 'mostPeople' : 'leftmostOfTie' }
}

/** Each player holding a seat scores `perSeat` for every one. */
function playerScores(seats: ColorCounts, perSeat: number): Partial<Record<PlayerColor, number>> {
  return Object.fromEntries(PLAYER_COLORS.flatMap(color => (seats[color] ? [[color, seats[color] * perSeat]] : [])))
}

/** Counts `city`'s votes as the board stands. Doesn't change any scores. */
export function countVotes(state: VotesState, city: TownId[]): ElectionResult {
  const seats = residencesInCity(state, city).map(({ key, tile }) => ({
    residence: key,
    people: tile.people,
    ...seatWinner(tile.people),
  }))
  const seatsByColor = countByColor(seats.flatMap(seat => (seat.winner ? [seat.winner] : [])))
  const perSeat = factoryCountIn(state, city)
  return {
    number: state.elections.length + 1,
    turn: state.turn.number,
    city,
    seats,
    seatsByColor,
    pointsPerSeat: perSeat,
    scores: playerScores(seatsByColor, perSeat),
  }
}

/** After a merger's arrivals, each player adds 1 cube of their colour to the bag for every seat they won. */
export function addSeatCubes(state: VotesState, result: ElectionResult): VotesState {
  const winners = PLAYER_COLORS.filter(color => (result.seatsByColor[color] ?? 0) > 0)
  return winners.reduce((current, color) => {
    const count = result.seatsByColor[color] ?? 0
    const bagged = addToBag(current, color, count)
    const entry = { kind: 'bagged' as const, turn: state.turn.number, color, count, reason: 'seats' as const }
    return { ...bagged, log: [...bagged.log, entry] }
  }, state)
}

export function holdElection(state: VotesState, city: TownId[]): VotesState {
  const result = countVotes(state, city)
  return {
    ...state,
    players: state.players.map(player => ({ ...player, score: player.score + (result.scores[player.color] ?? 0) })),
    elections: [...state.elections, result],
  }
}
