import { Button } from 'game-kit/turns'
import type { HexKey } from '../../map/hexGrid'
import { activePlayerState, factoryPoints, peopleAt } from '../../rules/boardQueries'
import { citiesTouchedBy } from '../../rules/mergers'
import { hasAnyLegalPlacement, newTile, PLACEABLE_KINDS } from '../../rules/placement'
import { eligibleResidences } from '../../rules/relocation'
import { RESIDENCE_CAPACITY, type PlaceableKind, type VotesMove, type VotesState } from '../../rules/types'
import { cityLabel, countOf, describeHex, PlayerChip, TILE_NAMES, TileIcon } from '../names'
import type { TurnControls } from '../useTurnControls'
import { Panel } from './Panel'
import { PersonChoices } from './PersonChoices'

const TILE_ICON_WIDTH = 34

function TilePicker({ controls }: { controls: TurnControls }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {PLACEABLE_KINDS.map(kind => {
        const isChosen = controls.placement.tile === kind
        return (
          <button
            key={kind}
            type="button"
            aria-pressed={isChosen}
            onClick={() => controls.chooseTile(kind)}
            className={`flex items-center gap-2 rounded-xl border p-2 text-left transition-colors ${
              isChosen ? 'border-ink bg-slot' : 'border-rule bg-paper hover:bg-slot'
            }`}
          >
            <TileIcon tile={newTile(kind)} width={TILE_ICON_WIDTH} />
            <span className="text-sm font-semibold">{TILE_NAMES[kind]}</span>
          </button>
        )
      })}
    </div>
  )
}

function schoolEffects(state: VotesState, at: HexKey): string[] {
  const eligible = eligibleResidences(state, at).length
  if (eligible === 0) return ['No Residence next to it is free of another School, so nobody is relocated.']
  return [
    `Relocation: you move 1 person, from that Residence’s city or a neighboring one, into one of the ${countOf(eligible, 'Residence')} next to it that touch no other School, even a full one.`,
  ]
}

/** What placing the chosen tile here would do, so the player can confirm with eyes open. */
function placementEffects(state: VotesState, kind: PlaceableKind, at: HexKey): string[] {
  const { own, joins } = citiesTouchedBy(state, at)
  const towns = [...own, ...joins.flatMap(join => join.city)]
  const effects: string[] = []
  if (kind === 'residence') effects.push(`A seat, with space for ${countOf(RESIDENCE_CAPACITY, 'person', 'people')}.`)
  if (kind === 'factory') {
    const where = towns.length === 1 ? 'the Station' : 'a Station of your choice'
    effects.push(`Immigration: draws ${countOf(state.factoryArrivals, 'person', 'people')} from the bag onto ${where} of city ${cityLabel(towns)}.`)
    const points = factoryPoints(at)
    effects.push(`Worth ${countOf(points, 'point')} at elections${points > 1 ? ' (it borders the rail)' : ''}.`)
  }
  if (kind === 'school') effects.push(...schoolEffects(state, at))
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
          : 'Choose a tile to place. It goes on an empty hex touching a tile or Station.'}
      </p>
      <TilePicker controls={controls} />
      <ChosenPlacement state={state} controls={controls} />
    </div>
  )
}

/** Where a Factory's people arrive, when its city has more than one Station. */
function StationChoices({ state, stations, onMove }: { state: VotesState; stations: HexKey[]; onMove: (move: VotesMove) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink-soft">
        Your Factory brings {countOf(state.factoryArrivals, 'person', 'people')} from the bag to one Station in its city. Choose a
        highlighted Station on the map, or here.
      </p>
      <div className="flex flex-col gap-1.5">
        {stations.map(station => (
          <Button
            key={station}
            tone="secondary"
            onClick={() => onMove({ kind: 'arrive', station })}
            className="px-3 py-2 text-left text-sm"
          >
            {describeHex(state, station)} · {peopleAt(state, station).length} waiting
          </Button>
        ))}
      </div>
    </div>
  )
}

function waitingText(state: VotesState): string {
  const { phase } = state
  if (phase.kind === 'placement') return 'is placing a tile'
  if (phase.kind === 'relocation') return 'is moving a person for their School'
  if (phase.kind === 'immigration') return 'is choosing where their Factory’s people arrive'
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
  if (phase.kind === 'immigration') {
    return (
      <Panel title="Immigration">
        <StationChoices state={state} stations={phase.stations} onMove={onMove} />
      </Panel>
    )
  }
  return (
    <Panel title={phase.kind === 'relocation' ? 'Relocation' : 'Housing'}>
      <PersonChoices state={state} picker={controls.person} />
    </Panel>
  )
}
