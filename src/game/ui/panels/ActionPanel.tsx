import { Button } from 'game-kit/turns'
import { districtOf } from '../../map/board'
import type { HexKey } from '../../map/hexGrid'
import { activePlayerState, factoryPoints, stations } from '../../rules/boardQueries'
import { citiesJoinedBy } from '../../rules/mergers'
import { legalPlacements, newTile, TILE_KINDS } from '../../rules/placement'
import { residencesNextTo } from '../../rules/relocation'
import { RESIDENCE_CAPACITY, type PlayerState, type TileKind, type VotesMove, type VotesState } from '../../rules/types'
import { countOf, PlayerChip, TILE_NAMES, TileIcon } from '../names'
import type { TurnControls } from '../useTurnControls'
import { Panel } from './Panel'
import { PersonChoices } from './PersonChoices'

const TILE_ICON_WIDTH = 34

function stockLabel(player: PlayerState, kind: TileKind): string {
  if (kind === 'residence') return `${player.residencesLeft} left`
  if (kind === 'station') return `${player.stationsLeft} left`
  return 'Supply'
}

function TilePicker({ state, controls }: { state: VotesState; controls: TurnControls }) {
  const player = activePlayerState(state)
  return (
    <div className="grid grid-cols-2 gap-2">
      {TILE_KINDS.map(kind => {
        const isPlaceable = legalPlacements(state, kind).length > 0
        const isChosen = controls.placement.tile === kind
        return (
          <button
            key={kind}
            type="button"
            disabled={!isPlaceable}
            aria-pressed={isChosen}
            onClick={() => controls.chooseTile(kind)}
            className={`flex items-center gap-2 rounded-xl border p-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              isChosen ? 'border-ink bg-slot' : 'border-rule bg-paper hover:bg-slot'
            }`}
          >
            <TileIcon tile={newTile(kind, player.color)} width={TILE_ICON_WIDTH} />
            <span className="flex flex-col leading-tight">
              <span className="text-sm font-semibold">{TILE_NAMES[kind]}</span>
              <span className="text-xs text-ink-soft">{stockLabel(player, kind)}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

function immigrationEffect(state: VotesState, tile: TileKind, at: HexKey): string | null {
  const district = districtOf(at)
  if (tile === 'station') {
    const count = state.arrivals.perStation
    return `Immigration: draws ${countOf(count, 'person', 'people')} from the bag onto it, and you add ${countOf(count, 'cube')} to the bag.`
  }
  if (tile !== 'factory') return null
  const stationCount = stations(state).filter(({ key }) => districtOf(key) === district).length
  if (stationCount === 0) return `Immigration: no Station in district ${district} yet, so nobody arrives.`
  return `Immigration: draws ${countOf(state.arrivals.perFactory, 'person', 'people')} onto each of the ${countOf(stationCount, 'Station')} in district ${district}; each owner adds a cube to the bag per person.`
}

/** What placing the chosen tile here would do, so the player can confirm with eyes open. */
function placementEffects(state: VotesState, tile: TileKind, at: HexKey): string[] {
  const district = districtOf(at)
  const effects: string[] = []
  if (tile === 'residence') effects.push(`A seat, with space for ${countOf(RESIDENCE_CAPACITY, 'person', 'people')}.`)
  const immigration = immigrationEffect(state, tile, at)
  if (immigration) effects.push(immigration)
  if (tile === 'factory') {
    const points = factoryPoints(at)
    effects.push(`Worth ${countOf(points, 'point')} at elections${points > 1 ? ' (it borders a rail)' : ''}.`)
  }
  if (tile === 'school') {
    const neighbors = residencesNextTo(state, at).length
    effects.push(
      neighbors
        ? `Relocation: you move 1 person from anywhere into each of the ${countOf(neighbors, 'Residence')} next to it, even a full one.`
        : 'No Residence next to it, so nobody is relocated.',
    )
  }
  const joins = citiesJoinedBy(state, at)
  if (joins.length) {
    const cities = joins.map(join => join.city.join('+')).join(' and ')
    effects.push(`Merges district ${district}’s city with ${cities}. That city votes.`)
  }
  return effects
}

function PlacementChoices({ state, controls, onMove }: { state: VotesState; controls: TurnControls; onMove: (move: VotesMove) => void }) {
  const canPlaceAnything = TILE_KINDS.some(kind => legalPlacements(state, kind).length > 0)
  if (!canPlaceAnything) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm">No tile you have fits anywhere, so you pass.</p>
        <Button onClick={() => onMove({ kind: 'pass' })}>Pass</Button>
      </div>
    )
  }

  const { tile, at } = controls.placement
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink-soft">
        {tile ? 'Choose a highlighted hex on the map.' : 'Choose a tile to place.'}
      </p>
      <TilePicker state={state} controls={controls} />
      {tile && at && (
        <div className="flex flex-col gap-2 rounded-xl bg-slot p-3">
          <p className="text-sm font-semibold">
            {TILE_NAMES[tile]} in district {districtOf(at)}
          </p>
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
      )}
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
  if (state.phase.kind === 'relocation') {
    return (
      <Panel title="Relocation">
        <PersonChoices state={state} picker={controls.person} />
      </Panel>
    )
  }
  return (
    <Panel title="Housing">
      <PersonChoices state={state} picker={controls.person} />
    </Panel>
  )
}
