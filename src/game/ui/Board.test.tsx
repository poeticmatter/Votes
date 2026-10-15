import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { nextIndex, type PlayerProfile, type Seating, type UserRole } from 'game-kit/turns'
import { callableStations, homesForDrawnFamily } from '../rules/immigration'
import { legalPlacements, TILE_KINDS } from '../rules/placement'
import { createInitialState, DEFAULT_SETTINGS } from '../rules/setup'
import { applyMove } from '../rules/turnFlow'
import type { VotesMove, VotesState } from '../rules/types'
import { VotesBoard } from './Board'

// Renders the board for states taken from a seeded game, to catch anything that
// throws while rendering a phase the rules tests never draw.

const PLAYERS: PlayerProfile[] = [{ name: 'Ana' }, { name: 'Ben', isOnline: false }, { name: 'Cleo' }]

function anyLegalMove(state: VotesState, random: number): { move: VotesMove; random: number } {
  const { phase } = state
  const options: VotesMove[] =
    phase.kind === 'immigration'
      ? phase.drawn
        ? homesForDrawnFamily(state).map(residence => ({ kind: 'settleFamily', residence }))
        : callableStations(state).map(station => ({ kind: 'callStation', station }))
      : TILE_KINDS.flatMap(tile => legalPlacements(state, tile).map(at => ({ kind: 'place' as const, tile, at })))
  const { index, nextState } = nextIndex(random, options.length)
  return { move: options.length ? options[index] : { kind: 'pass' }, random: nextState }
}

/** Plays a seeded game from the start until `isWanted` holds. */
function playUntil(isWanted: (state: VotesState) => boolean): VotesState {
  let state = createInitialState({ settings: DEFAULT_SETTINGS, playerCount: PLAYERS.length, seed: 21 })
  let random = 21
  while (!isWanted(state)) {
    if (state.phase.kind === 'gameOver') throw new Error('The game ended before reaching the wanted state')
    const next = anyLegalMove(state, random)
    state = applyMove(state, next.move)
    random = next.random
  }
  return state
}

function render(state: VotesState, role: UserRole, seating: Seating = 'remote'): string {
  return renderToStaticMarkup(<VotesBoard state={state} role={role} players={PLAYERS} onMove={() => {}} seating={seating} />)
}

const activeRole = (state: VotesState) => state.turn.playerIndex
const otherRole = (state: VotesState) => (state.turn.playerIndex + 1) % PLAYERS.length

describe('board rendering', () => {
  const start = playUntil(() => true)
  const choosingStation = playUntil(state => state.phase.kind === 'immigration' && !state.phase.drawn)
  const housingFamily = playUntil(state => state.phase.kind === 'immigration' && state.phase.drawn !== null)
  const afterElection = playUntil(state => state.elections.length > 0 && state.phase.kind === 'placement')
  const finished = playUntil(state => state.phase.kind === 'gameOver')

  it('offers the tile picker to the active player', () => {
    expect(render(start, activeRole(start))).toContain('Choose a tile to place')
  })

  it('tells everyone else whose turn it is', () => {
    expect(render(start, otherRole(start))).toContain('is placing a tile')
  })

  it('lists the Stations that can still bring a family', () => {
    expect(render(choosingStation, activeRole(choosingStation))).toContain('Station in district')
  })

  it('asks where the drawn family should live', () => {
    expect(render(housingFamily, activeRole(housingFamily))).toContain('Choose its home')
  })

  it('shows past elections', () => {
    expect(render(afterElection, 'spectator')).toContain('Election 1')
  })

  it('announces the winners', () => {
    expect(render(finished, 'spectator')).toContain('Game over')
  })

  it('names players instead of saying "You" in a hot-seat game', () => {
    expect(render(start, activeRole(start), 'hot_seat')).not.toContain('Your turn')
  })
})
