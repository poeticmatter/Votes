import type { TownId } from '../map/mapData'
import { distinctColors, factoriesInCity, factoryPoints, residencesInCity } from './boardQueries'
import { INDEPENDENT, type CubeColor, type ElectionResult, type PlayerColor, type SeatReason, type VotesState } from './types'

// Elections, held after every merger by the newly merged city only. Every Residence is
// a seat: the colour with the most people on it wins, and a tie goes to grey, so an
// empty Residence (a 0–0 tie) is grey's. The player with the most seats scores the
// city's Factories. Follows the asset generator's src/rules/elections.js, which refuses
// a position where grey ties players for the most seats; here those players still score.

export type ColorCounts = Partial<Record<CubeColor, number>>

export function countByColor(colors: readonly CubeColor[]): ColorCounts {
  return colors.reduce<ColorCounts>((counts, color) => ({ ...counts, [color]: (counts[color] ?? 0) + 1 }), {})
}

export function seatWinner(people: readonly CubeColor[]): { winner: CubeColor; reason: SeatReason } {
  const counts = countByColor(people)
  const top = Math.max(0, ...Object.values(counts).map(count => count ?? 0))
  const leaders = distinctColors(people).filter(color => counts[color] === top)
  return leaders.length === 1 ? { winner: leaders[0], reason: 'mostPeople' } : { winner: INDEPENDENT, reason: 'tieToGrey' }
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
    town: tile.town,
    people: tile.people,
    ...seatWinner(tile.people),
  }))
  const seatsByColor = countByColor(seats.map(seat => seat.winner))
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
