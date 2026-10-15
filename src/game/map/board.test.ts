import { describe, expect, it } from 'vitest'
import { BOARD, DISTRICT_IDS } from './board'

describe('derived board', () => {
  it('splits the open hexes into the five lettered districts', () => {
    const districts = new Set(BOARD.hexes.filter(hex => hex.terrain === 'open').map(hex => hex.district))
    expect([...districts].sort()).toEqual(DISTRICT_IDS)
  })

  it('leaves mountains and lakes outside every district', () => {
    const unbuildable = BOARD.hexes.filter(hex => hex.terrain !== 'open')
    expect(unbuildable.every(hex => hex.district === null)).toBe(true)
  })

  it('puts each printed Residence in the district it names', () => {
    const starts = BOARD.hexes.filter(hex => hex.startingResidence)
    expect(starts.map(hex => [hex.startingResidence, hex.district])).toEqual(
      starts.map(hex => [hex.startingResidence, hex.startingResidence]),
    )
  })

  it('marks hexes beside the track as bordering a rail', () => {
    // [5, 2] borders the north-south line (the rules-sheet Station example).
    expect(BOARD.hexByKey.get('5,2')?.bordersRail).toBe(true)
    // [3, 1] only borders the river.
    expect(BOARD.hexByKey.get('3,1')?.bordersRail).toBe(false)
  })

  it('separates B from C along the north-south rail', () => {
    expect(BOARD.hexByKey.get('5,1')?.district).toBe('B')
    expect(BOARD.hexByKey.get('6,1')?.district).toBe('C')
  })
})
