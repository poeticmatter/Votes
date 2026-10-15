import { useState } from 'react'
import { districtOf } from '../map/board'
import type { HexKey } from '../map/hexGrid'
import { activePlayerState } from '../rules/boardQueries'
import { callableStations, homesForDrawnFamily } from '../rules/immigration'
import { legalPlacements, newTile } from '../rules/placement'
import type { TileKind, VotesMove, VotesState } from '../rules/types'
import type { TilePreview } from './map/MapView'
import { TILE_NAMES } from './names'

// Turns the current phase into what the active player can click on the map, plus the
// tile they're about to place. Placement is chosen first and confirmed second, because
// it can't be taken back; immigration choices commit as soon as they're clicked.

export interface PlacementChoice {
  tile: TileKind | null
  at: HexKey | null
}

export interface TurnControls {
  targets: HexKey[]
  describeTarget: (key: HexKey) => string
  onTarget: (key: HexKey) => void
  preview: TilePreview | null
  emphasized: HexKey[]
  placement: PlacementChoice
  chooseTile: (tile: TileKind) => void
  confirmPlacement: () => void
  cancelPlacement: () => void
}

const NO_PLACEMENT: PlacementChoice = { tile: null, at: null }

/** A choice belongs to the turn it was made in, so it never carries over to the next player. */
interface TurnPlacementChoice extends PlacementChoice {
  turn: number
}

/** `canAct` is true when the viewer is the player the game is waiting for. */
export function useTurnControls(state: VotesState, canAct: boolean, onMove: (move: VotesMove) => void): TurnControls {
  const turn = state.turn.number
  const [choice, setChoice] = useState<TurnPlacementChoice>({ turn, ...NO_PLACEMENT })
  const placement: PlacementChoice = choice.turn === turn ? choice : NO_PLACEMENT
  const setPlacement = (next: PlacementChoice) => setChoice({ turn, ...next })

  const placementControls = {
    placement,
    chooseTile: (tile: TileKind) => setPlacement(placement.tile === tile ? NO_PLACEMENT : { tile, at: null }),
    confirmPlacement: () => {
      if (!placement.tile || !placement.at) return
      onMove({ kind: 'place', tile: placement.tile, at: placement.at })
      setPlacement(NO_PLACEMENT)
    },
    cancelPlacement: () => setPlacement(NO_PLACEMENT),
  }
  const idle = { targets: [], describeTarget: () => '', onTarget: () => {}, preview: null, emphasized: [] }

  const { phase } = state
  if (!canAct || phase.kind === 'gameOver') return { ...idle, ...placementControls }

  if (phase.kind === 'placement') {
    const { tile, at } = placement
    return {
      ...placementControls,
      targets: tile ? legalPlacements(state, tile) : [],
      describeTarget: key => `Place a ${tile ? TILE_NAMES[tile] : 'tile'} here, in district ${districtOf(key)}`,
      onTarget: key => setPlacement({ ...placement, at: key }),
      preview: tile && at ? { tile: newTile(tile, activePlayerState(state).color), at } : null,
      emphasized: [],
    }
  }

  if (!phase.drawn) {
    return {
      ...placementControls,
      targets: callableStations(state),
      describeTarget: key => `Call this Station to bring a family to district ${districtOf(key)}`,
      onTarget: station => onMove({ kind: 'callStation', station }),
      preview: null,
      emphasized: [],
    }
  }

  return {
    ...placementControls,
    targets: homesForDrawnFamily(state),
    describeTarget: () => 'House the family in this Residence',
    onTarget: residence => onMove({ kind: 'settleFamily', residence }),
    preview: null,
    emphasized: [phase.drawn.station],
  }
}
