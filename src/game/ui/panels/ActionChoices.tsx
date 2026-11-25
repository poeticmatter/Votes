import { Button } from 'game-kit/turns'
import type { HexKey } from '../../map/hexGrid'
import { activePlayerState, bagSize } from '../../rules/boardQueries'
import { citiesTouchedBy } from '../../rules/mergers'
import { PLACEABLE_KINDS, placeableKinds } from '../../rules/placement'
import { FACTORY_DRAW, FACTORY_PULL_LIMIT, RESIDENCE_PULL_GAP, type PlaceableKind, type VotesState } from '../../rules/types'
import { cityLabel, countOf, TILE_NAMES, TileIcon } from '../names'
import type { TurnControls } from '../useTurnControls'

// The turn's first step: place a tile from your own supply. A placement is chosen first
// and confirmed second, since it can't be taken back.

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
      <TileIcon kind={kind} width={TILE_ICON_WIDTH} />
      <span className="text-sm font-semibold">{TILE_NAMES[kind]}</span>
      <span className="text-xs tabular-nums text-ink-soft">{note}</span>
    </button>
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

const RESIDENCE_EFFECT = `Your own seat. Only you can pull people into it: from Factories while it holds fewer than ${FACTORY_PULL_LIMIT}, and from Residences with ${RESIDENCE_PULL_GAP} more people.`

const SCHOOL_EFFECT =
  'Residences in this city may pull from other cities too, and you add 1 of your cubes to the bag for every person who comes. Only one School per city.'

/** What placing the chosen tile here would do, so the player can confirm with eyes open. */
function placementEffects(state: VotesState, kind: PlaceableKind, at: HexKey): string[] {
  const { own, joins } = citiesTouchedBy(state, at)
  const effects: string[] = []
  if (kind === 'residence') effects.push(RESIDENCE_EFFECT)
  if (kind === 'factory') {
    const drawn = Math.min(FACTORY_DRAW, bagSize(state))
    effects.push(
      `It draws ${countOf(drawn, 'cube')} from the bag. Each time one is pulled out, you add 1 of your cubes to the bag. Every seat in its city scores 1 more point at elections.`,
    )
  }
  if (kind === 'school') effects.push(SCHOOL_EFFECT)
  if (joins.length) {
    effects.push(
      `Merges city ${cityLabel(own)} with ${joins.map(join => cityLabel(join.city)).join(' and ')}. The new city votes, then each of its Residences draws 1 person from the bag, then each player adds 1 cube to the bag per seat they won.`,
    )
  }
  effects.push('Then you may pull people into your Residences and the starting ones.')
  return effects
}

function ChosenPlacement({ state, controls }: { state: VotesState; controls: TurnControls }) {
  const { tile, at } = controls.placement
  if (!tile || !at) return null
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-slot p-3">
      <p className="text-sm font-semibold">Place a {TILE_NAMES[tile]}</p>
      <ul className="flex list-disc flex-col gap-1 pl-4 text-sm">
        {placementEffects(state, tile, at).map(effect => (
          <li key={effect}>{effect}</li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Button onClick={controls.confirmPlacement} className="flex-1">
          Place it
        </Button>
        <Button tone="secondary" onClick={controls.cancelPlacement}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

/** The turn's first step: place one tile. */
export function ActionChoices({ state, controls }: { state: VotesState; controls: TurnControls }) {
  const hint = controls.placement.tile ? 'Choose a highlighted hex on the map: empty, open, touching a tile.' : 'Choose a tile from your supply, then where it goes.'
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-soft">{hint}</p>
      <ChosenPlacement state={state} controls={controls} />
      <PlaceChoices state={state} controls={controls} />
    </div>
  )
}
