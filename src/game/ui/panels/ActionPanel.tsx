import { Button } from 'game-kit/turns'
import type { HexKey } from '../../map/hexGrid'
import { activePlayerState, citiesOf, peopleAt } from '../../rules/boardQueries'
import { hasAnyAction } from '../../rules/turnFlow'
import type { CubeColor, VotesMove, VotesState } from '../../rules/types'
import { countOf, CubeChip, describeHex, PlayerChip, useColorNameOf } from '../names'
import type { TurnControls } from '../useTurnControls'
import { ActionChoices } from './ActionChoices'
import { Panel } from './Panel'
import { PersonChoices } from './PersonChoices'

/** Where the person a flipped Factory just drew goes, when Residences tie for least crowded. */
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
        Your Factory brings 1 person from the bag for each of the {countOf(citiesOf(state).length, 'city', 'cities')}, each into the
        least crowded Residence of that city.
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

function waitingText(state: VotesState): string {
  const { phase } = state
  if (phase.kind === 'action') return 'is choosing an action'
  if (phase.kind === 'arrival') return 'is choosing where their Factory’s new person lives'
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
  if (phase.kind === 'action') {
    if (!hasAnyAction(state)) {
      return (
        <Panel title="Your action">
          <div className="flex flex-col gap-3">
            <p className="text-sm">There is no tile to take, place or flip, so you pass.</p>
            <Button onClick={() => onMove({ kind: 'pass' })}>Pass</Button>
          </div>
        </Panel>
      )
    }
    return (
      <Panel title="Your action">
        <ActionChoices state={state} controls={controls} onMove={onMove} />
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
