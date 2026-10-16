import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { nextIndex, type PlayerIndex, type PlayerProfile, type Seating, type UserRole } from 'game-kit/turns'
import { createInitialState, DEFAULT_SETTINGS } from '../rules/setup'
import { legalMoves } from '../rules/testStates'
import { applyMove } from '../rules/turnFlow'
import type { VotesState } from '../rules/types'
import { PIECE_COLORS } from './pieceColors'
import { VotesBoard } from './Board'

// Renders the board for states taken from a seeded game, to catch anything that
// throws while rendering a phase the rules tests never draw.

const PLAYERS: PlayerProfile[] = [{ name: 'Ana' }, { name: 'Ben', isOnline: false }, { name: 'Cleo' }]

/** Plays a seeded game from the start until `isWanted` holds. */
function playUntil(isWanted: (state: VotesState) => boolean): VotesState {
  let state = createInitialState({ settings: DEFAULT_SETTINGS, playerCount: PLAYERS.length, seed: 21 })
  let random = 21
  while (!isWanted(state)) {
    if (state.phase.kind === 'gameOver') throw new Error('The game ended before reaching the wanted state')
    const options = legalMoves(state)
    const { index, nextState } = nextIndex(random, options.length)
    state = applyMove(state, options[index])
    random = nextState
  }
  return state
}

interface View {
  role: UserRole
  seating?: Seating
  lookOf?: (seat: PlayerIndex) => PlayerIndex
}

function render(state: VotesState, { role, seating = 'remote', lookOf = seat => seat }: View): string {
  return renderToStaticMarkup(
    <VotesBoard state={state} role={role} players={PLAYERS} onMove={() => {}} seating={seating} lookOf={lookOf} />,
  )
}

const activeRole = (state: VotesState) => state.turn.playerIndex
const otherRole = (state: VotesState) => (state.turn.playerIndex + 1) % PLAYERS.length

describe('board rendering', () => {
  const start = playUntil(() => true)
  const relocating = playUntil(state => state.phase.kind === 'relocation')
  const housing = playUntil(state => state.phase.kind === 'housing')
  const afterElection = playUntil(state => state.elections.length > 0 && state.phase.kind === 'placement')
  const finished = playUntil(state => state.phase.kind === 'gameOver')

  it('offers the tile picker to the active player', () => {
    expect(render(start, { role: activeRole(start) })).toContain('Choose a tile to place')
  })

  it('tells everyone else whose turn it is', () => {
    expect(render(start, { role: otherRole(start) })).toContain('is placing a tile')
  })

  it('asks who a School relocates', () => {
    expect(render(relocating, { role: activeRole(relocating) })).toContain('Your School moves 1 person')
  })

  it('lists the Stations with people to house', () => {
    expect(render(housing, { role: activeRole(housing) })).toContain('Station in')
  })

  it('shows past elections', () => {
    expect(render(afterElection, { role: 'spectator' })).toContain('Election 1')
  })

  it('announces the winners', () => {
    expect(render(finished, { role: 'spectator' })).toContain('Game over')
  })

  it('explains a game saved by another version instead of crashing on it', () => {
    const olderGame = { ...start, rulesVersion: 1 }
    expect(render(olderGame, { role: 0 })).toContain('started with a different version of Votes')
  })

  it('names players instead of saying "You" in a hot-seat game', () => {
    expect(render(start, { role: activeRole(start), seating: 'hot_seat' })).not.toContain('Your turn')
  })

  it('draws a disguised seat only in the colour it looks like', () => {
    // Seat 1 plays vermillion; disguised as seat 3, everything of vermillion's should come out yellow.
    const markup = render(afterElection, { role: 'spectator', seating: 'hot_seat', lookOf: seat => (seat === 1 ? 3 : seat) })
    expect(markup).toContain(PIECE_COLORS.yellow.fill)
    expect(markup).not.toContain(PIECE_COLORS.vermillion.fill)
  })
})
