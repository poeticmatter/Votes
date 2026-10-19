import { useState } from 'react'
import type { HexKey } from '../map/hexGrid'
import { housingMoves } from '../rules/housing'
import { legalPlacements, newTile } from '../rules/placement'
import { relocationMoves } from '../rules/relocation'
import type { CubeColor, PersonMove, PlaceableKind, VotesMove, VotesState } from '../rules/types'
import type { TilePreview } from './map/MapView'
import { describeHex, TILE_NAMES } from './names'

// Turns the current phase into what the active player can click on the map. Placement
// is chosen first and confirmed second, because it can't be taken back. Moving a person
// (a School's relocation, or housing) is picked in steps: where from, which colour when
// there's a choice, then where to; it commits on that last click.

export interface PlacementChoice {
  tile: PlaceableKind | null
  at: HexKey | null
}

export interface PlacementControls {
  placement: PlacementChoice
  chooseTile: (tile: PlaceableKind) => void
  confirmPlacement: () => void
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

const NO_PLACEMENT: PlacementChoice = { tile: null, at: null }

const IDLE_MAP: MapControls = { targets: [], describeTarget: () => '', onTarget: () => {}, preview: null, emphasized: [] }

const distinct = <T>(items: T[]): T[] => [...new Set(items)]

/** A choice belongs to the turn it was made in, so it never carries over to the next player. */
interface TurnPlacementChoice extends PlacementChoice {
  turn: number
}

function usePlacementControls(state: VotesState, onMove: (move: VotesMove) => void): PlacementControls & { setAt: (at: HexKey) => void } {
  const turn = state.turn.number
  const [choice, setChoice] = useState<TurnPlacementChoice>({ turn, ...NO_PLACEMENT })
  const placement: PlacementChoice = choice.turn === turn ? choice : NO_PLACEMENT
  const setPlacement = (next: PlacementChoice) => setChoice({ turn, ...next })

  return {
    placement,
    chooseTile: tile => {
      if (placement.tile === tile) setPlacement(NO_PLACEMENT)
      // Every kind fits the same hexes, so a chosen hex survives a change of kind.
      else setPlacement({ tile, at: placement.at })
    },
    setAt: at => setPlacement({ ...placement, at }),
    confirmPlacement: () => {
      if (!placement.tile || !placement.at) return
      onMove({ kind: 'place', tile: placement.tile, at: placement.at })
      setPlacement(NO_PLACEMENT)
    },
    cancelPlacement: () => setPlacement(NO_PLACEMENT),
  }
}

function personMovesNow(state: VotesState): PersonMove[] {
  if (state.phase.kind === 'relocation') return relocationMoves(state)
  if (state.phase.kind === 'housing') return housingMoves(state)
  return []
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
      onMove({ kind: state.phase.kind === 'relocation' ? 'relocate' : 'house', from, color, to })
      reset()
    },
    reset,
  }
}

function placementMap(state: VotesState, placement: PlacementChoice, setAt: (at: HexKey) => void): MapControls {
  const { tile, at } = placement
  if (!tile) return IDLE_MAP
  return {
    targets: legalPlacements(state),
    describeTarget: () => `Place a ${TILE_NAMES[tile]} here`,
    onTarget: setAt,
    preview: at ? { tile: newTile(tile), at } : null,
    emphasized: [],
  }
}

function immigrationMap(state: VotesState, stations: HexKey[], onMove: (move: VotesMove) => void): MapControls {
  return {
    ...IDLE_MAP,
    targets: stations,
    describeTarget: key => `Bring the new people to the ${describeHex(state, key)}`,
    onTarget: station => onMove({ kind: 'arrive', station }),
    emphasized: state.turn.placedAt ? [state.turn.placedAt] : [],
  }
}

function personMap(state: VotesState, person: PersonPicker): MapControls {
  const { phase } = state
  const isRelocation = phase.kind === 'relocation'
  if (!person.from) {
    return {
      ...IDLE_MAP,
      targets: distinct(person.moves.map(move => move.from)),
      describeTarget: key => (isRelocation ? 'Take a person from here' : `House a person waiting at the ${describeHex(state, key)}`),
      onTarget: person.chooseFrom,
      // While the player looks for someone to move, show where they're owed.
      emphasized: isRelocation ? phase.residences : [],
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
  const { setAt, ...placementControls } = usePlacementControls(state, onMove)
  const person = usePersonPicker(state, onMove)
  const shared = { ...placementControls, person }

  const { phase } = state
  if (!canAct || phase.kind === 'gameOver') return { ...IDLE_MAP, ...shared }
  if (phase.kind === 'placement') return { ...placementMap(state, placementControls.placement, setAt), ...shared }
  if (phase.kind === 'immigration') return { ...immigrationMap(state, phase.stations, onMove), ...shared }
  return { ...personMap(state, person), ...shared }
}
