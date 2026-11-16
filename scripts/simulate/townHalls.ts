import { createInitialState } from '../../src/game/rules/setup'
import { applyMove } from '../../src/game/rules/turnFlow'
import type { PlayerColor, VotesSettings, VotesState } from '../../src/game/rules/types'
import { botPlayer } from './playGame'
import { HUB_CUBE_SETS } from './tweaks'

// How Town Halls get used in bot games of one rule set: who places theirs, whether it
// holds its own election or joins cities, and what its election scores.
//
//   npx vite-node scripts/simulate/townHalls.ts -- [games per player count] [set id]

const PLAYER_COUNTS = [3, 4, 5]
const MOVE_LIMIT = 5000

interface HallTally {
  players: number
  placed: number
  ownElections: number
  /** Points from Town Hall elections, to the player who placed the Hall. */
  placerPoints: number
  /** Points from Town Hall elections, to everyone else. */
  otherPoints: number
  totalPoints: number
  /** Summed over own elections: how far through the game it came (0 to 1), its city's seats, and its points per seat. */
  gameShare: number
  seats: number
  pointsPerSeat: number
  /** Games in which every player placed their Hall. */
  everyonePlaced: number
  games: number
}

function playOut(settings: VotesSettings, playerCount: number, seed: number): VotesState {
  let state = createInitialState({ settings, playerCount, seed })
  for (let moves = 0; state.phase.kind !== 'gameOver' && moves < MOVE_LIMIT; moves += 1) {
    state = applyMove(state, botPlayer(state))
  }
  return state
}

function tallyGame(state: VotesState, tally: HallTally): void {
  const placers = new Map<number, PlayerColor>()
  let lastPlacer: PlayerColor | null = null
  for (const entry of state.log) {
    if (entry.kind === 'placed') lastPlacer = entry.tile === 'hall' ? entry.player : null
    if (entry.kind === 'hallElection' && lastPlacer) placers.set(entry.electionNumber, lastPlacer)
  }
  const hallPlacements = state.log.filter(entry => entry.kind === 'placed' && entry.tile === 'hall').length
  tally.players += state.players.length
  tally.placed += hallPlacements
  tally.ownElections += placers.size
  tally.everyonePlaced += hallPlacements === state.players.length ? 1 : 0
  tally.games += 1
  tally.totalPoints += state.players.reduce((sum, player) => sum + player.score, 0)
  for (const election of state.elections) {
    const placer = placers.get(election.number)
    if (!placer) continue
    tally.gameShare += election.turn / state.turn.number
    tally.seats += election.seats.length
    tally.pointsPerSeat += election.pointsPerSeat
    for (const [color, points] of Object.entries(election.scores)) {
      if (color === placer) tally.placerPoints += points ?? 0
      else tally.otherPoints += points ?? 0
    }
  }
}

function main(): void {
  const [gamesArg, setId = 'F+all hub2c c01222'] = process.argv.slice(2).filter(arg => arg !== '--')
  const games = Number(gamesArg ?? 200)
  const variant = HUB_CUBE_SETS.find(candidate => candidate.id === setId)
  if (!variant) throw new Error(`Unknown set ${setId}`)
  console.log(`${variant.id}: ${variant.description}`)
  for (const count of PLAYER_COUNTS) {
    const tally: HallTally = { players: 0, placed: 0, ownElections: 0, placerPoints: 0, otherPoints: 0, totalPoints: 0, gameShare: 0, seats: 0, pointsPerSeat: 0, everyonePlaced: 0, games: 0 }
    for (let seed = 1; seed <= games; seed += 1) tallyGame(playOut(variant.settings, count, seed), tally)
    const percent = (value: number) => `${Math.round(value * 100)}%`
    const perHall = (value: number) => (value / tally.ownElections).toFixed(1)
    console.log(
      [
        `${count}p`,
        `Halls placed ${percent(tally.placed / tally.players)}`,
        `every player placed theirs in ${percent(tally.everyonePlaced / tally.games)} of games`,
        `own election ${percent(tally.ownElections / tally.placed)} of placed Halls`,
        `own elections come ${percent(tally.gameShare / tally.ownElections)} of the way through the game, with ${perHall(tally.seats)} seats at ${perHall(tally.pointsPerSeat)} points each`,
        `per own election: placer ${perHall(tally.placerPoints)}, others ${perHall(tally.otherPoints)} points`,
        `Hall elections' share of all points ${percent((tally.placerPoints + tally.otherPoints) / tally.totalPoints)}`,
        `average points per player ${(tally.totalPoints / tally.players).toFixed(1)}`,
      ].join(' | '),
    )
  }
}

main()
