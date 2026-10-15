import { Button } from '../../../platform/controls'
import { districtOf, hexAt } from '../../map/board'
import type { HexKey } from '../../map/hexGrid'
import { activePlayerState } from '../../rules/boardQueries'
import { callableStations, homesForDrawnFamily } from '../../rules/immigration'
import { citiesJoinedBy } from '../../rules/mergers'
import { legalPlacements, newTile, schoolBonusAt, TILE_KINDS } from '../../rules/placement'
import { HOMES_PER_RESIDENCE, type PlayerState, type TileKind, type VotesMove, type VotesState } from '../../rules/types'
import { countOf, CubeChip, PlayerChip, TILE_NAMES, TileIcon, useOwnerOf } from '../names'
import { PIECE_COLORS } from '../pieceColors'
import type { TurnControls } from '../useTurnControls'
import { Panel } from './Panel'

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

/** What placing the chosen tile here would do, so the player can confirm with eyes open. */
function placementEffects(state: VotesState, tile: TileKind, at: HexKey): string[] {
  const district = districtOf(at)
  const effects: string[] = []
  if (tile === 'station') effects.push(`Brings a family into district ${district} at the end of every turn.`)
  if (tile === 'factory') {
    effects.push(`Adds 5 jobs. Worth ${hexAt(at).bordersRail ? '2 points (it borders a rail)' : '1 point'} at elections.`)
  }
  if (tile === 'school') effects.push(`School bonus: you add ${countOf(schoolBonusAt(state, at), 'cube')} to the bag.`)
  const joins = citiesJoinedBy(state, at)
  if (joins.length) {
    const cities = joins.map(join => join.city.join('+')).join(' and ')
    effects.push(`Merges district ${district}’s city with ${cities}. An election follows.`)
  }
  return effects
}

function PlacementChoices({ state, controls, onMove }: { state: VotesState; controls: TurnControls; onMove: (move: VotesMove) => void }) {
  const canPlaceAnything = TILE_KINDS.some(kind => legalPlacements(state, kind).length > 0)
  if (!canPlaceAnything) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm">No tile you have fits anywhere, so you pass. Immigration still happens.</p>
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

function useDescribeResidence(state: VotesState): (key: HexKey) => string {
  const ownerOf = useOwnerOf()
  return key => {
    const tile = state.tiles[key]
    if (tile?.kind !== 'residence') return key
    const owner = tile.owner ? `${ownerOf(tile.owner)} Residence` : `Printed Residence ${districtOf(key)}`
    return `${owner} · ${tile.families.length}/${HOMES_PER_RESIDENCE} homes`
  }
}

function ChoiceList({ keys, describe, onChoose }: { keys: HexKey[]; describe: (key: HexKey) => string; onChoose: (key: HexKey) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      {keys.map(key => (
        <Button key={key} tone="secondary" onClick={() => onChoose(key)} className="px-3 py-2 text-left text-sm">
          {describe(key)}
        </Button>
      ))}
    </div>
  )
}

function ImmigrationChoices({ state, onMove }: { state: VotesState; onMove: (move: VotesMove) => void }) {
  const ownerOf = useOwnerOf()
  const describeResidence = useDescribeResidence(state)
  const { phase } = state
  if (phase.kind !== 'immigration') return null

  if (phase.drawn) {
    const { color, station } = phase.drawn
    return (
      <div className="flex flex-col gap-3">
        <p className="flex items-center gap-2 text-sm">
          <CubeChip color={color} size={22} />
          <span>
            A <strong>{PIECE_COLORS[color].name}</strong> family arrives in district {districtOf(station)}. Choose its home.
          </span>
        </p>
        <ChoiceList
          keys={homesForDrawnFamily(state)}
          describe={describeResidence}
          onChoose={residence => onMove({ kind: 'settleFamily', residence })}
        />
      </div>
    )
  }

  const stations = callableStations(state)
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink-soft">
        {stations.length === 1 ? 'One Station brings' : `${stations.length} Stations each bring`} a family. Choose which
        goes next; a family is drawn from the bag when you do.
      </p>
      <ChoiceList
        keys={stations}
        describe={key => {
          const tile = state.tiles[key]
          const owner = tile?.kind === 'station' ? ownerOf(tile.owner) : ''
          return `${owner} Station in district ${districtOf(key)}`
        }}
        onChoose={station => onMove({ kind: 'callStation', station })}
      />
    </div>
  )
}

function waitingText(state: VotesState): string {
  const { phase } = state
  if (phase.kind === 'placement') return 'is placing a tile'
  if (phase.kind === 'immigration') return phase.drawn ? 'is housing a new family' : 'is bringing in families'
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
    <Panel title="Immigration">
      <ImmigrationChoices state={state} onMove={onMove} />
    </Panel>
  )
}
