import { describe, expect, it } from 'vitest'
import { BOARD, DISTRICT_IDS, isStationSiteInUse } from './board'

describe('derived board', () => {
  it('splits the open hexes into the five lettered districts', () => {
    const districts = new Set(BOARD.hexes.filter(hex => hex.terrain === 'open').map(hex => hex.district))
    expect([...districts].sort()).toEqual(DISTRICT_IDS)
  })

  it('leaves mountains, lakes and forests outside every district', () => {
    const unbuildable = BOARD.hexes.filter(hex => hex.terrain !== 'open')
    expect(unbuildable.every(hex => hex.district === null)).toBe(true)
  })

  it('has forest along the rail south of D and E', () => {
    expect(BOARD.hexByKey.get('6,7')?.terrain).toBe('forest')
  })

  it('puts each printed Residence in the district it names', () => {
    const starts = BOARD.hexes.filter(hex => hex.startingResidence)
    expect(starts.map(hex => [hex.startingResidence, hex.district])).toEqual(
      starts.map(hex => [hex.startingResidence, hex.startingResidence]),
    )
  })

  it('marks hexes beside the track as bordering a rail', () => {
    // [5, 2] borders the north-south line.
    expect(BOARD.hexByKey.get('5,2')?.bordersRail).toBe(true)
    // [3, 1] only borders the river.
    expect(BOARD.hexByKey.get('3,1')?.bordersRail).toBe(false)
  })

  it('separates B from C along the north-south rail', () => {
    expect(BOARD.hexByKey.get('5,1')?.district).toBe('B')
    expect(BOARD.hexByKey.get('6,1')?.district).toBe('C')
  })
})

describe('station sites', () => {
  const sitesInUse = (playerCount: number) => BOARD.hexes.filter(hex => isStationSiteInUse(hex, playerCount)).length

  it('uses as many sites as the rules table says for each player count', () => {
    expect([2, 3, 4, 5].map(sitesInUse)).toEqual([6, 6, 8, 10])
  })

  it('puts every site on an open hex', () => {
    const sites = BOARD.hexes.filter(hex => hex.stationSiteMinPlayers !== null)
    expect(sites.every(hex => hex.district !== null)).toBe(true)
  })
})
