import type { TownId } from '../map/mapData'
import { cityValue, distinctColors, residencesInCity } from './boardQueries'
import { pointsPerSeat } from './payout'
import { PLAYER_COLORS, type CubeColor, type ElectionResult, type PlayerColor, type SeatResult, type VotesState } from './types'

// Elections, held after every merger by the newly merged city only. Every Residence is
// a seat: the colour with the most people on it wins, and a tie goes to the tied colour
// furthest left, the one that has lived there longest (people sit in a row, newcomers on
// the right). An empty Residence is nobody's. The payout table gives the points per seat
// from the city's Factory and Mine value and its number of seats, and every player
// scores that for each seat they hold. Grey and empty seats count toward the city's
// seats but score for nobody.

export type ColorCounts = Partial<Record<CubeColor, number>>

export function countByColor(colors: readonly CubeColor[]): ColorCounts {
  return colors.reduce<ColorCounts>((counts, color) => ({ ...counts, [color]: (counts[color] ?? 0) + 1 }), {})
}

export function seatWinner(people: readonly CubeColor[]): Pick<SeatResult, 'winner' | 'reason'> {
  const counts = countByColor(people)
  const top = Math.max(0, ...Object.values(counts).map(count => count ?? 0))
  // Colours are listed in the order they first appear, so the first leader is the leftmost.
  const leaders = distinctColors(people).filter(color => counts[color] === top)
  if (people.length === 0) return { winner: null, reason: 'empty' }
  return { winner: leaders[0], reason: leaders.length === 1 ? 'mostPeople' : 'leftmostOfTie' }
}

/** Each player holding a seat scores `perSeat` for every one; grey seats score for nobody. */
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
  const value = cityValue(state, city)
  const perSeat = pointsPerSeat(value, seats.length)
  return {
    number: state.elections.length + 1,
    turn: state.turn.number,
    city,
    seats,
    seatsByColor,
    cityValue: value,
    pointsPerSeat: perSeat,
    scores: playerScores(seatsByColor, perSeat),
  }
}

export function holdElection(state: VotesState, city: TownId[]): VotesState {
  const result = countVotes(state, city)
  return {
    ...state,
    players: state.players.map(player => ({ ...player, score: player.score + (result.scores[player.color] ?? 0) })),
    elections: [...state.elections, result],
  }
}
