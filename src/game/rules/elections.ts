import type { TownId } from '../map/mapData'
import { distinctColors, factoriesInCity, factoryPoints, residencesInCity } from './boardQueries'
import { INDEPENDENT, type CubeColor, type ElectionResult, type PlayerColor, type SeatResult, type VotesState } from './types'

// Elections, held after every merger by the newly merged city only. Every Residence is
// a seat: the colour with the most people on it wins, and a tie goes to the tied colour
// furthest left, the one that has lived there longest (people sit in a row, newcomers on
// the right). An empty Residence is nobody's. The player with the most seats scores the
// city's Factories. Players tied with grey for the most seats still score.

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

/**
 * The players with the most seats score, all of them on a tie. Nobody scores when no
 * player holds a seat or when grey holds more seats than any player.
 */
export function cityScorers(seats: ColorCounts, players: PlayerColor[]): PlayerColor[] {
  const mostPlayerSeats = Math.max(0, ...players.map(color => seats[color] ?? 0))
  if (mostPlayerSeats === 0 || (seats[INDEPENDENT] ?? 0) > mostPlayerSeats) return []
  return players.filter(color => (seats[color] ?? 0) === mostPlayerSeats)
}

/** Counts `city`'s votes as the board stands. Doesn't change any scores. */
export function countVotes(state: VotesState, city: TownId[]): ElectionResult {
  const seats = residencesInCity(state, city).map(({ key, tile }) => ({
    residence: key,
    people: tile.people,
    ...seatWinner(tile.people),
  }))
  const seatsByColor = countByColor(seats.flatMap(seat => (seat.winner ? [seat.winner] : [])))
  return {
    number: state.elections.length + 1,
    turn: state.turn.number,
    city,
    seats,
    seatsByColor,
    factoryPoints: factoriesInCity(state, city).reduce((total, { key }) => total + factoryPoints(key), 0),
    scorers: cityScorers(seatsByColor, state.players.map(player => player.color)),
  }
}

export function holdElection(state: VotesState, city: TownId[]): VotesState {
  const result = countVotes(state, city)
  return {
    ...state,
    players: state.players.map(player =>
      result.scorers.includes(player.color) ? { ...player, score: player.score + result.factoryPoints } : player,
    ),
    elections: [...state.elections, result],
  }
}
