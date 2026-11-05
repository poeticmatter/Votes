import { useState } from 'react'
import type { HexKey } from '../map/hexGrid'
import { movementMoves } from '../rules/movement'
import { flipTargets } from '../rules/actions'
import { legalPlacements, newTile } from '../rules/placement'
import type { CubeColor, PersonMove, PlaceableKind, VotesMove, VotesState } from '../rules/types'
import type { TilePreview } from './map/MapView'
import { describeHex, TILE_NAMES } from './names'

// Turns the current phase into what the active player can click on the map. A placement
// or a flip is chosen first and confirmed second, because it can't be taken back. When the rules
// leave a choice of who moves, the person is picked in steps: where from, which colour
// when there's a choice, then where to; it commits on that last click.

/** The action being chosen: a tile from your supply and where it goes, or a tile to flip. */
export interface PlacementChoice {
  tile: PlaceableKind | null
  at: HexKey | null
  flipAt: HexKey | null
}

export interface PlacementControls {
  placement: PlacementChoice
  chooseTile: (tile: PlaceableKind) => void
  confirmPlacement: () => void
  confirmFlip: () => void
  cancelPlacement: () => void
}

export interface PersonPicker {
  /** Every person the active player may move right now. */
  moves: PersonMove[]
  from: HexKey | null
  color: CubeColor | null
  /** Colours that can move from `from`. */
  colorsAtFrom: CubeColor[]
  /** Where the chosen person may go. */
  destinations: HexKey[]
  chooseFrom: (key: HexKey) => void
  chooseColor: (color: CubeColor) => void
  chooseDestination: (key: HexKey) => void
  reset: () => void
}

export interface MapControls {
  targets: HexKey[]
  describeTarget: (key: HexKey) => string
  onTarget: (key: HexKey) => void
  preview: TilePreview | null
  emphasized: HexKey[]
}

export interface TurnControls extends MapControls, PlacementControls {
  person: PersonPicker
}

const NO_PLACEMENT: PlacementChoice = { tile: null, at: null, flipAt: null }

const IDLE_MAP: MapControls = { targets: [], describeTarget: () => '', onTarget: () => {}, preview: null, emphasized: [] }

const distinct = <T>(items: T[]): T[] => [...new Set(items)]

/** A choice belongs to the turn it was made in, so it never carries over to the next player. */
interface TurnPlacementChoice extends PlacementChoice {
  turn: number
}

interface PlacementSetters {
  setAt: (at: HexKey) => void
  setFlipAt: (at: HexKey) => void
}

function usePlacementControls(state: VotesState, onMove: (move: VotesMove) => void): PlacementControls & PlacementSetters {
  const turn = state.turn.number
  const [choice, setChoice] = useState<TurnPlacementChoice>({ turn, ...NO_PLACEMENT })
  const placement: PlacementChoice = choice.turn === turn ? choice : NO_PLACEMENT
  const setPlacement = (next: PlacementChoice) => setChoice({ turn, ...next })

  return {
    placement,
    chooseTile: tile => {
      if (placement.tile === tile) setPlacement(NO_PLACEMENT)
      // A chosen hex survives a change of kind when the new kind fits there too: only a
      // School can be refused where the others fit.
      else setPlacement({ tile, at: placement.at && legalPlacements(state, tile).includes(placement.at) ? placement.at : null, flipAt: null })
    },
    setAt: at => setPlacement({ ...placement, at }),
    setFlipAt: flipAt => setPlacement({ ...NO_PLACEMENT, flipAt }),
    confirmPlacement: () => {
      if (!placement.tile || !placement.at) return
      onMove({ kind: 'place', tile: placement.tile, at: placement.at })
      setPlacement(NO_PLACEMENT)
    },
    confirmFlip: () => {
      if (!placement.flipAt) return
      onMove({ kind: 'flip', at: placement.flipAt })
      setPlacement(NO_PLACEMENT)
    },
    cancelPlacement: () => setPlacement(NO_PLACEMENT),
  }
}

function personMovesNow(state: VotesState): PersonMove[] {
  return state.phase.kind === 'movement' ? movementMoves(state) : []
}

/**
 * A pick belongs to the position it was made in: every move adds to the log, so the
 * log's length tells positions apart, even after an undo.
 */
interface PositionPersonChoice {
  position: number
  from: HexKey | null
  color: CubeColor | null
}

function usePersonPicker(state: VotesState, onMove: (move: VotesMove) => void): PersonPicker {
  const position = state.log.length
  const [choice, setChoice] = useState<PositionPersonChoice>({ position, from: null, color: null })
  const current = choice.position === position ? choice : { position, from: null, color: null }

  const moves = personMovesNow(state)
  const from = current.from && moves.some(move => move.from === current.from) ? current.from : null
  const colorsAtFrom = from ? distinct(moves.filter(move => move.from === from).map(move => move.color)) : []
  const pickedColor = current.color && colorsAtFrom.includes(current.color) ? current.color : null
  const color = pickedColor ?? (colorsAtFrom.length === 1 ? colorsAtFrom[0] : null)
  const destinations = moves.filter(move => move.from === from && move.color === color).map(move => move.to)

  const reset = () => setChoice({ position, from: null, color: null })
  return {
    moves,
    from,
    color,
    colorsAtFrom,
    destinations,
    chooseFrom: key => setChoice({ position, from: key, color: null }),
    chooseColor: picked => setChoice({ position, from, color: picked }),
    chooseDestination: to => {
      if (!from || !color) return
      onMove({ kind: 'move', from, color, to })
      reset()
    },
    reset,
  }
}

function placementMap(state: VotesState, placement: PlacementChoice, { setAt, setFlipAt }: PlacementSetters): MapControls {
  const { tile, at, flipAt } = placement
  // With no tile chosen to place, the map offers the tiles that can be flipped.
  if (!tile) {
    return {
      ...IDLE_MAP,
      targets: flipTargets(state),
      describeTarget: key => `Flip the ${describeHex(state, key)}`,
      onTarget: setFlipAt,
      emphasized: flipAt ? [flipAt] : [],
    }
  }
  return {
    targets: legalPlacements(state, tile),
    describeTarget: () => `Place a ${TILE_NAMES[tile]} here`,
    onTarget: setAt,
    preview: at ? { tile: newTile(tile), at } : null,
    emphasized: [],
  }
}

function arrivalMap(state: VotesState, residences: HexKey[], onMove: (move: VotesMove) => void): MapControls {
  return {
    ...IDLE_MAP,
    targets: residences,
    describeTarget: key => `The new person moves into the ${describeHex(state, key)}`,
    onTarget: residence => onMove({ kind: 'arrive', residence }),
    emphasized: state.turn.placedAt ? [state.turn.placedAt] : [],
  }
}

function personMap(state: VotesState, person: PersonPicker): MapControls {
  if (!person.from) {
    return {
      ...IDLE_MAP,
      targets: distinct(person.moves.map(move => move.from)),
      describeTarget: key => `Move a person from the ${describeHex(state, key)}`,
      onTarget: person.chooseFrom,
    }
  }
  return {
    ...IDLE_MAP,
    targets: person.destinations,
    describeTarget: key => `Move the person into the ${describeHex(state, key)}`,
    onTarget: person.chooseDestination,
    emphasized: [person.from],
  }
}

/** `canAct` is true when the viewer is the player the game is waiting for. */
export function useTurnControls(state: VotesState, canAct: boolean, onMove: (move: VotesMove) => void): TurnControls {
  const { setAt, setFlipAt, ...placementControls } = usePlacementControls(state, onMove)
  const person = usePersonPicker(state, onMove)
  const shared = { ...placementControls, person }

  const { phase } = state
  if (!canAct || phase.kind === 'gameOver') return { ...IDLE_MAP, ...shared }
  if (phase.kind === 'action') return { ...placementMap(state, placementControls.placement, { setAt, setFlipAt }), ...shared }
  if (phase.kind === 'arrival') return { ...arrivalMap(state, phase.residences, onMove), ...shared }
  return { ...personMap(state, person), ...shared }
}
