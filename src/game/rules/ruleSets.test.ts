import { describe, expect, it } from 'vitest'
import { legalMoves } from './legalMoves'
import { RULE_SETS, ruleSetIdOf } from './ruleSets'
import { createInitialState } from './setup'

describe('rule sets', () => {
  it.each(RULE_SETS)('$name starts a game at every player count', ({ settings }) => {
    for (const playerCount of [3, 4, 5]) {
      const state = createInitialState({ settings, playerCount, seed: 7 })
      expect(legalMoves(state).length).toBeGreaterThan(0)
    }
  })

  it.each(RULE_SETS)('$name is recognised from its settings', ({ id, settings }) => {
    expect(ruleSetIdOf(settings)).toBe(id)
  })

  it('gives every Round 3 player a Town Hall of their own', () => {
    const roundThree = RULE_SETS.find(ruleSet => ruleSet.id === 'roundThree')
    if (!roundThree) throw new Error('Round 3 rule set missing')
    const state = createInitialState({ settings: roundThree.settings, playerCount: 4, seed: 7 })
    expect(state.players.every(player => player.supply.hall === 1)).toBe(true)
  })

  it('offers only placements in Round 3', () => {
    const roundThree = RULE_SETS.find(ruleSet => ruleSet.id === 'roundThree')
    if (!roundThree) throw new Error('Round 3 rule set missing')
    const state = createInitialState({ settings: roundThree.settings, playerCount: 4, seed: 7 })
    expect(legalMoves(state).every(move => move.kind === 'place')).toBe(true)
  })
})
