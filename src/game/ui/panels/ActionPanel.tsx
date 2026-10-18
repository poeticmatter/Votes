import { Button } from 'game-kit/turns'
import type { HexKey } from '../../map/hexGrid'
import type { TownId } from '../../map/mapData'
import { activePlayerState, factoryPoints } from '../../rules/boardQueries'
import { citiesJoinedBy } from '../../rules/mergers'
import { hasAnyLegalPlacement, legalPlacements, newTile, PLACEABLE_KINDS, townJoinedAt } from '../../rules/placement'
import { residencesNextTo, schoolVotes } from '../../rules/relocation'
import { RESIDENCE_CAPACITY, TOWN_COLORS, type VotesMove, type VotesState } from '../../rules/types'
import { countOf, PlayerChip, TILE_NAMES, TileIcon, tileName } from '../names'
import { TOWN_LOOKS } from '../townColors'
import { isSameTile, type TileChoice, type TurnControls } from '../useTurnControls'
import { Panel } from './Panel'
import { PersonChoices } from './PersonChoices'

const TILE_ICON_WIDTH = 30

/** One row per town colour, one column per kind; a colour with nowhere to go is greyed out. */
function TilePicker({ state, controls }: { state: VotesState; controls: TurnControls }) {
  return (
    <div className="grid grid-cols-[auto_repeat(3,minmax(0,1fr))] items-center gap-1.5">
      {TOWN_COLORS.map(color => {
        const isPlaceable = legalPlacements(state, color).length > 0
        return [
          <span key={`${color}-name`} className={`pr-1 text-xs font-semibold text-ink-soft ${isPlaceable ? '' : 'opacity-40'}`}>
            {TOWN_LOOKS[color].name}
          </span>,
          ...PLACEABLE_KINDS.map(kind => {
            const tile: TileChoice = { kind, color }
            const isChosen = isSameTile(controls.placement.tile, tile)
            return (
              <button
                key={`${color}-${kind}`}
                type="button"
                disabled={!isPlaceable}
                aria-pressed={isChosen}
                aria-label={tileName(kind, color)}
                onClick={() => controls.chooseTile(tile)}
                className={`flex items-center gap-1.5 rounded-xl border p-1.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  isChosen ? 'border-ink bg-slot' : 'border-rule bg-paper hover:bg-slot'
                }`}
              >
                {/* The icon only shows the look, so any town of the colour will do. */}
                <TileIcon tile={newTile(kind, color, 'A')} width={TILE_ICON_WIDTH} />
                <span className="truncate text-xs font-semibold">{TILE_NAMES[kind]}</span>
              </button>
            )
          }),
        ]
      })}
    </div>
  )
}

function schoolEffects(state: VotesState, at: HexKey): string[] {
  const neighbors = residencesNextTo(state, at).length
  if (neighbors === 0) return ['No Residence next to it, so nobody is relocated.']
  const votes = schoolVotes(state, at)
  return [
    `Relocation: you move 1 person from anywhere into each of the ${countOf(neighbors, 'Residence')} next to it, even a full one, and add a cube to the bag for each.`,
    votes
      ? `Votes: ${countOf(votes, 'cube')} into the bag for the Residences next to it that touch no other School.`
      : 'Every Residence next to it touches another School, so it earns no extra votes.',
  ]
}

/** What placing the chosen tile here would do, so the player can confirm with eyes open. */
function placementEffects(state: VotesState, { kind }: TileChoice, at: HexKey, town: TownId): string[] {
  const effects: string[] = []
  if (kind === 'residence') effects.push(`A seat, with space for ${countOf(RESIDENCE_CAPACITY, 'person', 'people')}.`)
  if (kind === 'factory') {
    effects.push(`Immigration: draws ${countOf(state.factoryArrivals, 'person', 'people')} from the bag onto town ${town}’s Station.`)
    const points = factoryPoints(at)
    effects.push(`Worth ${countOf(points, 'point')} at elections${points > 1 ? ' (it borders a rail)' : ''}.`)
  }
  if (kind === 'school') effects.push(...schoolEffects(state, at))
  const joins = citiesJoinedBy(state, town, at)
  if (joins.length) {
    const cities = joins.map(join => join.city.join('+')).join(' and ')
    effects.push(`Merges town ${town}’s city with ${cities}. That city votes.`)
  }
  return effects
}

function ChosenPlacement({ state, controls }: { state: VotesState; controls: TurnControls }) {
  const { tile, at } = controls.placement
  const town = tile && at ? townJoinedAt(state, tile.color, at) : null
  if (!tile || !at || !town) return null
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-slot p-3">
      <p className="text-sm font-semibold">
        {tileName(tile.kind, tile.color)} in town {town}
      </p>
      <ul className="flex list-disc flex-col gap-1 pl-4 text-sm">
        {placementEffects(state, tile, at, town).map(effect => (
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
          : 'Choose a tile to place. It goes next to a tile of its colour, and may not connect two towns of that colour.'}
      </p>
      <TilePicker state={state} controls={controls} />
      <ChosenPlacement state={state} controls={controls} />
    </div>
  )
}

function waitingText(state: VotesState): string {
  const { phase } = state
  if (phase.kind === 'placement') return 'is placing a tile'
  if (phase.kind === 'relocation') return 'is moving people for their School'
  if (phase.kind === 'housing') return 'is housing people'
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
  if (!canAct) {
    return (
      <Panel>
        <p className="text-sm">
          <PlayerChip color={activePlayerState(state).color} /> {waitingText(state)}…
        </p>
      </Panel>
    )
  }
  if (state.phase.kind === 'placement') {
    return (
      <Panel title="Place a tile">
        <PlacementChoices state={state} controls={controls} onMove={onMove} />
      </Panel>
    )
  }
  return (
    <Panel title={state.phase.kind === 'relocation' ? 'Relocation' : 'Housing'}>
      <PersonChoices state={state} picker={controls.person} />
    </Panel>
  )
}
