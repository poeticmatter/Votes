import { Button } from 'game-kit/turns'
import { activePlayerState } from '../../rules/boardQueries'
import { hasAnyPlacement } from '../../rules/turnFlow'
import type { VotesMove, VotesState } from '../../rules/types'
import { PlayerChip } from '../names'
import type { TurnControls } from '../useTurnControls'
import { ActionChoices } from './ActionChoices'
import { Panel } from './Panel'
import { PullChoices } from './PullChoices'

function waitingText(state: VotesState): string {
  const { phase } = state
  if (phase.kind === 'action') return 'is choosing a tile to place'
  if (phase.kind === 'pulling') return 'is pulling people into their Residences'
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
    if (!hasAnyPlacement(state)) {
      return (
        <Panel title="Place a tile">
          <div className="flex flex-col gap-3">
            <p className="text-sm">No tile in your supply fits anywhere, so you pass. You can still pull people afterwards.</p>
            <Button onClick={() => onMove({ kind: 'pass' })}>Pass</Button>
          </div>
        </Panel>
      )
    }
    return (
      <Panel title="Place a tile">
        <ActionChoices state={state} controls={controls} />
      </Panel>
    )
  }
  return (
    <Panel title="Pull people">
      <PullChoices state={state} picker={controls.pull} onEndTurn={() => onMove({ kind: 'endTurn' })} />
    </Panel>
  )
}
