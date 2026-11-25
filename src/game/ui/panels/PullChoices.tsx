import { Button } from 'game-kit/turns'
import type { HexKey } from '../../map/hexGrid'
import { peopleAt } from '../../rules/boardQueries'
import { FACTORY_PULL_LIMIT, RESIDENCE_PULL_GAP, type VotesState } from '../../rules/types'
import { countOf, CubeChip, describeHex, PlayerChip, useColorNameOf } from '../names'
import type { PullPicker } from '../useTurnControls'
import { useByLook } from '../viewer'

// Pulling people, one at a time, after placing a tile: the player picks the Residence
// pulling (on the map, or from a list), where from, and which colour and whose School is
// credited when there's a choice. The map highlights the same choices.

const PULL_RULES = `Pull people into your own Residences or a starting one: from a Factory while the Residence holds fewer than ${FACTORY_PULL_LIMIT}, or from a Residence with at least ${RESIDENCE_PULL_GAP} more people. Both from the same city, or from any city if the Residence’s city has a School. A Factory’s owner adds a cube to the bag for each person taken from it (grey for a printed Factory), and a School’s owner for each person who comes from another city.`

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

function ColorChoices({ picker }: { picker: PullPicker }) {
  const byLook = useByLook()
  const colorNameOf = useColorNameOf()
  return (
    <div className="flex flex-wrap gap-2">
      {byLook(picker.colors).map(color => (
        <Button key={color} tone="secondary" onClick={() => picker.chooseColor(color)} className="flex items-center gap-2 px-3 py-2 text-sm">
          <CubeChip color={color} size={18} /> {colorNameOf(color)}
        </Button>
      ))}
    </div>
  )
}

function CreditChoices({ picker }: { picker: PullPicker }) {
  return (
    <div className="flex flex-wrap gap-2">
      {picker.credits.map(owner => (
        <Button key={owner} tone="secondary" onClick={() => picker.chooseCredit(owner)} className="px-3 py-2 text-sm">
          <PlayerChip color={owner} />
        </Button>
      ))}
    </div>
  )
}

function Step({ state, picker }: { state: VotesState; picker: PullPicker }) {
  const describe = (key: HexKey) => `${describeHex(state, key)} · ${countOf(peopleAt(state, key).length, 'person', 'people')}`
  const back = (
    <Button tone="secondary" onClick={picker.reset}>
      Back
    </Button>
  )
  if (!picker.to) {
    if (picker.pulls.length === 0) return <p className="text-sm">Nobody can be pulled now.</p>
    return <ChoiceList keys={[...new Set(picker.pulls.map(move => move.to))]} describe={describe} onChoose={picker.chooseTo} />
  }
  if (!picker.from) {
    const sources = [...new Set(picker.pulls.filter(move => move.to === picker.to).map(move => move.from))]
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm">Pull into the {describeHex(state, picker.to)} from where?</p>
        <ChoiceList keys={sources} describe={key => describeHex(state, key)} onChoose={picker.chooseFrom} />
        {back}
      </div>
    )
  }
  if (!picker.color) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm">Who comes from the {describeHex(state, picker.from)}?</p>
        <ColorChoices picker={picker} />
        {back}
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm">The person comes from another city, and the city has Schools of several owners. Whose School adds a cube to the bag?</p>
      <CreditChoices picker={picker} />
      {back}
    </div>
  )
}

export function PullChoices({ state, picker, onEndTurn }: { state: VotesState; picker: PullPicker; onEndTurn: () => void }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink-soft">{PULL_RULES}</p>
      <Step state={state} picker={picker} />
      <Button onClick={onEndTurn}>End turn</Button>
    </div>
  )
}
