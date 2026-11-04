import { Button } from 'game-kit/turns'
import type { HexKey } from '../../map/hexGrid'
import { activePlayerState, industryValue, peopleAt } from '../../rules/boardQueries'
import { arrivalCount } from '../../rules/immigration'
import { citiesTouchedBy } from '../../rules/mergers'
import { hasAnyLegalPlacement, legalPlacements, newTile, PLACEABLE_KINDS, placeableKinds } from '../../rules/placement'
import type { CubeColor, IndustryKind, PlaceableKind, VotesMove, VotesState } from '../../rules/types'
import { cityLabel, countOf, CubeChip, describeHex, PlayerChip, TILE_NAMES, TileIcon, useColorNameOf } from '../names'
import type { TurnControls } from '../useTurnControls'
import { Panel } from './Panel'
import { PersonChoices } from './PersonChoices'

const TILE_ICON_WIDTH = 64

/** Why a kind can't be chosen: none left, or nowhere it fits. */
function unavailableNote(state: VotesState, kind: PlaceableKind): string {
  if (state.supply[kind] === 0) return 'none left'
  if (kind === 'mine') return 'no mountain free'
  // Somewhere a Residence fits, so it's the one-School-per-city rule that stops it.
  if (kind === 'school' && legalPlacements(state, 'residence').length > 0) return 'every city has one'
  return 'no room'
}

function TilePicker({ state, controls }: { state: VotesState; controls: TurnControls }) {
  const available = placeableKinds(state)
  return (
    <div className="grid grid-cols-2 gap-2">
      {PLACEABLE_KINDS.map(kind => {
        const isChosen = controls.placement.tile === kind
        const isAvailable = available.includes(kind)
        return (
          <button
            key={kind}
            type="button"
            aria-pressed={isChosen}
            disabled={!isAvailable}
            onClick={() => controls.chooseTile(kind)}
            className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 transition-colors disabled:opacity-40 ${
              isChosen ? 'border-ink bg-slot' : 'border-rule bg-paper enabled:hover:bg-slot'
            }`}
          >
            <TileIcon tile={newTile(kind)} width={TILE_ICON_WIDTH} />
            <span className="text-sm font-semibold">{TILE_NAMES[kind]}</span>
            <span className="text-xs tabular-nums text-ink-soft">
              {state.supply[kind]} left{isAvailable ? '' : ` · ${unavailableNote(state, kind)}`}
            </span>
          </button>
        )
      })}
    </div>
  )
}

const RESIDENCE_EFFECT =
  'A seat. People from Residences in this city with at least 2 more people move in, the most crowded first.'

const SCHOOL_EFFECT =
  'This city pulls people from cities with no School: from a Residence there into one here with fewer people, the most crowded first. Only one School per city.'

/** What the tile would add to its city's value at elections, as the board stands. */
function valueEffect(state: VotesState, kind: IndustryKind, at: HexKey): string {
  const value = industryValue(state, kind, at)
  const why = kind === 'factory' ? ' (1, +1 if it touches a Mine)' : ''
  return `Worth ${value} at elections${why}.`
}

/** What placing the chosen tile here would do, so the player can confirm with eyes open. */
function placementEffects(state: VotesState, kind: PlaceableKind, at: HexKey): string[] {
  const { own, joins } = citiesTouchedBy(state, at)
  const towns = [...own, ...joins.flatMap(join => join.city)]
  const effects: string[] = []
  if (kind === 'residence') effects.push(RESIDENCE_EFFECT)
  if (kind === 'factory' || kind === 'mine') {
    const count = countOf(state.arrivals[kind], 'person', 'people')
    effects.push(`Immigration: draws ${count} from the bag, one at a time, each into the least crowded Residence of city ${cityLabel(towns)}.`)
    effects.push(valueEffect(state, kind, at))
  }
  if (kind === 'school') effects.push(SCHOOL_EFFECT)
  if (joins.length) {
    effects.push(`Merges city ${cityLabel(own)} with ${joins.map(join => cityLabel(join.city)).join(' and ')}. The new city votes.`)
  }
  return effects
}

function ChosenPlacement({ state, controls }: { state: VotesState; controls: TurnControls }) {
  const { tile, at } = controls.placement
  if (!tile || !at) return null
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-slot p-3">
      <p className="text-sm font-semibold">{TILE_NAMES[tile]}</p>
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

function PlacementChoices({ state, controls, onMove }: { state: VotesState; controls: TurnControls; onMove: (move: VotesMove) => void }) {
  if (!hasAnyLegalPlacement(state)) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm">No tile fits anywhere, so you pass.</p>
        <Button onClick={() => onMove({ kind: 'pass' })}>Pass</Button>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink-soft">
        {controls.placement.tile
          ? 'Choose a highlighted hex on the map.'
          : 'Choose a tile to place. It goes on an empty hex touching a tile; only Mines go on mountains.'}
      </p>
      <TilePicker state={state} controls={controls} />
      <ChosenPlacement state={state} controls={controls} />
    </div>
  )
}

/** Where the person a Factory or Mine just drew goes, when Residences tie for least crowded. */
function ArrivalChoices({
  state,
  person,
  residences,
  onMove,
}: {
  state: VotesState
  person: CubeColor
  residences: HexKey[]
  onMove: (move: VotesMove) => void
}) {
  const colorNameOf = useColorNameOf()
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink-soft">
        Your {placedName(state)} brings {countOf(arrivalCount(state), 'person', 'people')} from the bag, one at a time, each into the
        least crowded Residence of its city.
      </p>
      <p className="flex items-center gap-2 text-sm">
        <CubeChip color={person} size={18} />
        <span>
          A <strong>{colorNameOf(person)}</strong> person arrived. These Residences tie for least crowded: choose one on the map, or here.
        </span>
      </p>
      <div className="flex flex-col gap-1.5">
        {residences.map(residence => (
          <Button
            key={residence}
            tone="secondary"
            onClick={() => onMove({ kind: 'arrive', residence })}
            className="px-3 py-2 text-left text-sm"
          >
            {describeHex(state, residence)} · {countOf(peopleAt(state, residence).length, 'person', 'people')}
          </Button>
        ))}
      </div>
    </div>
  )
}

/** "Factory" or "Mine": the tile placed this turn. */
function placedName(state: VotesState): string {
  const at = state.turn.placedAt
  const tile = at ? state.tiles[at] : undefined
  return tile ? TILE_NAMES[tile.kind] : 'tile'
}

function waitingText(state: VotesState): string {
  const { phase } = state
  if (phase.kind === 'placement') return 'is placing a tile'
  if (phase.kind === 'arrival') return `is choosing where their ${placedName(state)}’s new person lives`
  if (phase.kind === 'movement') return 'is choosing who moves'
  return ''
}

export function ActionPanel({
  state,
  canAct,
  controls,
  onMove,
}: {
  state: VotesState
  canAct: boolean
  controls: TurnControls
  onMove: (move: VotesMove) => void
}) {
  const { phase } = state
  if (!canAct) {
    return (
      <Panel>
        <p className="text-sm">
          <PlayerChip color={activePlayerState(state).color} /> {waitingText(state)}…
        </p>
      </Panel>
    )
  }
  if (phase.kind === 'placement') {
    return (
      <Panel title="Place a tile">
        <PlacementChoices state={state} controls={controls} onMove={onMove} />
      </Panel>
    )
  }
  if (phase.kind === 'arrival') {
    return (
      <Panel title="Immigration">
        <ArrivalChoices state={state} person={phase.person} residences={phase.residences} onMove={onMove} />
      </Panel>
    )
  }
  return (
    <Panel title="Movement">
      <PersonChoices state={state} picker={controls.person} />
    </Panel>
  )
}
