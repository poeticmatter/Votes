import { Button } from 'game-kit/turns'
import type { HexKey } from '../../map/hexGrid'
import { flipTargets, overcrowdedAround, takeableKinds } from '../../rules/actions'
import { activePlayerState, citiesOf } from '../../rules/boardQueries'
import { citiesTouchedBy } from '../../rules/mergers'
import { legalPlacements, PLACEABLE_KINDS, placeableKinds, placeTile } from '../../rules/placement'
import { OVERCROWDED_AT, RESIDENCES_PER_FACTORY, TAKEABLE_KINDS, type PlaceableKind, type VotesMove, type VotesState } from '../../rules/types'
import { cityLabel, countOf, describeHex, faceUpTile, TILE_NAMES, TileIcon } from '../names'
import type { TurnControls } from '../useTurnControls'

// The turn's one action: take a tile from the shared supply, place one from your own, or
// flip one on the map. Taking happens at once; a placement or a flip is chosen first and
// confirmed second, since neither can be taken back.

const TILE_ICON_WIDTH = 56

function TileButton({
  kind,
  note,
  isChosen,
  isAvailable,
  onClick,
}: {
  kind: PlaceableKind
  note: string
  isChosen: boolean
  isAvailable: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={isChosen}
      disabled={!isAvailable}
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2 transition-colors disabled:opacity-40 ${
        isChosen ? 'border-ink bg-slot' : 'border-rule bg-paper enabled:hover:bg-slot'
      }`}
    >
      <TileIcon tile={faceUpTile(kind)} width={TILE_ICON_WIDTH} />
      <span className="text-sm font-semibold">{TILE_NAMES[kind]}</span>
      <span className="text-xs tabular-nums text-ink-soft">{note}</span>
    </button>
  )
}

function TakeChoices({ state, onMove }: { state: VotesState; onMove: (move: VotesMove) => void }) {
  const available = takeableKinds(state)
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">Take a tile into your supply</h3>
      <div className="grid grid-cols-2 gap-2">
        {TAKEABLE_KINDS.map(kind => (
          <TileButton
            key={kind}
            kind={kind}
            note={`${state.supply[kind]} in the supply`}
            isChosen={false}
            isAvailable={available.includes(kind)}
            onClick={() => onMove({ kind: 'take', tile: kind })}
          />
        ))}
      </div>
    </section>
  )
}

function PlaceChoices({ state, controls }: { state: VotesState; controls: TurnControls }) {
  const available = placeableKinds(state)
  const { supply } = activePlayerState(state)
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">Place a tile from your supply</h3>
      <div className="grid grid-cols-3 gap-2">
        {PLACEABLE_KINDS.map(kind => (
          <TileButton
            key={kind}
            kind={kind}
            note={supply[kind] === 0 ? 'none' : `${supply[kind]} yours${available.includes(kind) ? '' : ' · no room'}`}
            isChosen={controls.placement.tile === kind}
            isAvailable={available.includes(kind)}
            onClick={() => controls.chooseTile(kind)}
          />
        ))}
      </div>
    </section>
  )
}

const SCHOOL_EFFECT =
  'Goes face up. This city pulls people from cities with no School: from a Residence there into one here with fewer people, the most crowded first. Only one School per city.'

/** What placing the chosen tile here would do, so the player can confirm with eyes open. */
function placementEffects(state: VotesState, kind: PlaceableKind, at: HexKey): string[] {
  const { own, joins } = citiesTouchedBy(state, at)
  const towns = [...own, ...joins.flatMap(join => join.city)]
  const effects: string[] = []
  if (kind === 'residence') {
    const votes = overcrowdedAround(placeTile(state, kind, at), at)
    effects.push(
      `Goes face down: a promise, not a seat until someone flips it. You add ${countOf(votes, 'cube')} to the bag now, 1 for each overcrowded Residence (${OVERCROWDED_AT}+ people) in city ${cityLabel(towns)}.`,
    )
  }
  if (kind === 'factory') {
    const count = Math.min(RESIDENCES_PER_FACTORY, state.supply.residence)
    effects.push(`Goes face down: a promise that scores nothing until someone flips it. You take ${countOf(count, 'Residence tile')} into your supply.`)
  }
  if (kind === 'school') effects.push(SCHOOL_EFFECT)
  if (joins.length) {
    effects.push(`Merges city ${cityLabel(own)} with ${joins.map(join => cityLabel(join.city)).join(' and ')}. The new city votes.`)
  }
  return effects
}

/** What flipping the tile would do. */
function flipEffect(state: VotesState, at: HexKey): string {
  const tile = state.tiles[at]
  if (tile?.kind === 'residence') return 'Becomes a seat, and people in its city level into it.'
  if (tile?.kind === 'factory') {
    const cities = citiesOf(state).length
    return `Brings 1 person from the bag for each city (${cities}), each into its city’s least crowded Residence. From now on every seat in its city scores 1 more point.`
  }
  return 'Becomes a University: this city also pulls people from cities that have a School but no University.'
}

function Chosen({ title, effects, onConfirm, onCancel, confirmLabel }: { title: string; effects: string[]; onConfirm: () => void; onCancel: () => void; confirmLabel: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-slot p-3">
      <p className="text-sm font-semibold">{title}</p>
      <ul className="flex list-disc flex-col gap-1 pl-4 text-sm">
        {effects.map(effect => (
          <li key={effect}>{effect}</li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Button onClick={onConfirm} className="flex-1">
          {confirmLabel}
        </Button>
        <Button tone="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

function ChosenAction({ state, controls }: { state: VotesState; controls: TurnControls }) {
  const { tile, at, flipAt } = controls.placement
  if (tile && at) {
    return (
      <Chosen
        title={`Place a ${TILE_NAMES[tile]}`}
        effects={placementEffects(state, tile, at)}
        onConfirm={controls.confirmPlacement}
        onCancel={controls.cancelPlacement}
        confirmLabel="Place it"
      />
    )
  }
  if (flipAt) {
    return (
      <Chosen
        title={`Flip the ${describeHex(state, flipAt)}`}
        effects={[flipEffect(state, flipAt)]}
        onConfirm={controls.confirmFlip}
        onCancel={controls.cancelPlacement}
        confirmLabel="Flip it"
      />
    )
  }
  return null
}

function hint(state: VotesState, controls: TurnControls): string {
  if (controls.placement.tile) return 'Choose a highlighted hex on the map: empty, open, touching a tile.'
  const flips = flipTargets(state).length
  if (flips === 0) return 'Take a tile, or place one from your supply. Nothing on the map can be flipped yet.'
  return `Take a tile, place one from your supply, or flip one of the ${countOf(flips, 'highlighted tile')} on the map: any face-down tile, or a School in a city with two.`
}

/** The action phase: one of take, place or flip. */
export function ActionChoices({ state, controls, onMove }: { state: VotesState; controls: TurnControls; onMove: (move: VotesMove) => void }) {
  const canPlace = PLACEABLE_KINDS.some(kind => legalPlacements(state, kind).length > 0)
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-soft">{hint(state, controls)}</p>
      <ChosenAction state={state} controls={controls} />
      <TakeChoices state={state} onMove={onMove} />
      {canPlace || controls.placement.tile ? <PlaceChoices state={state} controls={controls} /> : null}
    </div>
  )
}
