import { useState } from 'react'
import type { HexKey } from '../map/hexGrid'
import { activePlayerState } from '../rules/boardQueries'
import { legalPlacements, newTile } from '../rules/placement'
import { legalPulls } from '../rules/pulls'
import type { CubeColor, PlaceableKind, PlayerColor, Pull, VotesMove, VotesState } from '../rules/types'
import type { TilePreview } from './map/MapView'
import { describeHex, TILE_NAMES } from './names'

// Turns the current phase into what the active player can click on the map. A placement
// is chosen first and confirmed second, because it can't be taken back. A pull is picked
// in steps: the Residence pulling, then where from, then which colour and whose School
// is credited when there's a choice; it commits once nothing is left to choose.

/** The tile being placed and where. */
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

export interface PullPicker {
  /** Every pull the active player may make right now. */
  pulls: Pull[]
  to: HexKey | null
  from: HexKey | null
  color: CubeColor | null
  /** Colours that can come from `from` into `to`. */
  colors: CubeColor[]
  /** Whose School may be credited for the chosen person, when there's a choice. */
  credits: PlayerColor[]
  chooseTo: (key: HexKey) => void
  chooseFrom: (key: HexKey) => void
  chooseColor: (color: CubeColor) => void
  chooseCredit: (owner: PlayerColor) => void
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
  pull: PullPicker
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
      // A chosen hex survives a change of kind when the new kind fits there too: only a
      // School can be refused where the others fit.
      else setPlacement({ tile, at: placement.at && legalPlacements(state, tile).includes(placement.at) ? placement.at : null })
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

/**
 * A pick belongs to the position it was made in: every move adds to the log, so the
 * log's length tells positions apart, even after an undo.
 */
interface PositionPullChoice {
  position: number
  to: HexKey | null
  from: HexKey | null
  color: CubeColor | null
}

const onlyOne = <T>(items: T[]): T | null => (items.length === 1 ? items[0] : null)

function usePullPicker(state: VotesState, onMove: (move: VotesMove) => void): PullPicker {
  const position = state.log.length
  const empty: PositionPullChoice = { position, to: null, from: null, color: null }
  const [choice, setChoice] = useState<PositionPullChoice>(empty)
  const current = choice.position === position ? choice : empty

  const pulls = legalPulls(state)
  const to = current.to && pulls.some(move => move.to === current.to) ? current.to : null
  const into = pulls.filter(move => move.to === to)
  const from = current.from && into.some(move => move.from === current.from) ? current.from : null
  const fromHere = into.filter(move => move.from === from)
  const colors = from ? distinct(fromHere.map(move => move.color)) : []
  const color = (current.color && colors.includes(current.color) ? current.color : null) ?? onlyOne(colors)
  const chosen = fromHere.filter(move => move.color === color)
  const credits = distinct(chosen.flatMap(move => (move.credit ? [move.credit] : [])))

  const commit = (move: Pull) => {
    onMove({ kind: 'pull', ...move })
    setChoice(empty)
  }
  // Each step commits as soon as the pull is settled, so no click is wasted on a forced choice.
  const commitIfSettled = (candidates: Pull[]) => {
    const settled = onlyOne(candidates)
    if (settled) commit(settled)
  }

  return {
    pulls,
    to,
    from,
    color,
    colors,
    credits,
    chooseTo: key => setChoice({ position, to: key, from: null, color: null }),
    chooseFrom: key => {
      setChoice({ position, to, from: key, color: null })
      commitIfSettled(into.filter(move => move.from === key))
    },
    chooseColor: picked => {
      setChoice({ position, to, from, color: picked })
      commitIfSettled(fromHere.filter(move => move.color === picked))
    },
    chooseCredit: owner => {
      const move = chosen.find(candidate => candidate.credit === owner)
      if (move) commit(move)
    },
    reset: () => setChoice(empty),
  }
}

function placementMap(state: VotesState, placement: PlacementChoice, setAt: (at: HexKey) => void): MapControls {
  const { tile, at } = placement
  if (!tile) return IDLE_MAP
  return {
    targets: legalPlacements(state, tile),
    describeTarget: () => `Place a ${TILE_NAMES[tile]} here`,
    onTarget: setAt,
    preview: at ? { tiles: { [at]: newTile(tile, activePlayerState(state).color) } } : null,
    emphasized: [],
  }
}

function pullMap(state: VotesState, picker: PullPicker): MapControls {
  if (!picker.to) {
    return {
      ...IDLE_MAP,
      targets: distinct(picker.pulls.map(move => move.to)),
      describeTarget: key => `Pull a person into the ${describeHex(state, key)}`,
      onTarget: picker.chooseTo,
    }
  }
  if (!picker.from) {
    return {
      ...IDLE_MAP,
      targets: distinct(picker.pulls.filter(move => move.to === picker.to).map(move => move.from)),
      describeTarget: key => `Pull from the ${describeHex(state, key)}`,
      onTarget: picker.chooseFrom,
      emphasized: [picker.to],
    }
  }
  return { ...IDLE_MAP, emphasized: [picker.to, picker.from] }
}

/** `canAct` is true when the viewer is the player the game is waiting for. */
export function useTurnControls(state: VotesState, canAct: boolean, onMove: (move: VotesMove) => void): TurnControls {
  const { setAt, ...placementControls } = usePlacementControls(state, onMove)
  const pull = usePullPicker(state, onMove)
  const shared = { ...placementControls, pull }

  switch (canAct ? state.phase.kind : 'gameOver') {
    case 'action':
      return { ...placementMap(state, placementControls.placement, setAt), ...shared }
    case 'pulling':
      return { ...pullMap(state, pull), ...shared }
    case 'gameOver':
      return { ...IDLE_MAP, ...shared }
  }
}
