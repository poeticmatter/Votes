import { Button } from 'game-kit/turns'
import type { HexKey } from '../../map/hexGrid'
import { peopleAt } from '../../rules/boardQueries'
import type { VotesState } from '../../rules/types'
import { countOf, CubeChip, describeHex, useColorNameOf } from '../names'
import type { PersonPicker } from '../useTurnControls'
import { useByLook } from '../viewer'

// Moving one person, when the rules leave a choice: the active player picks where from
// (on the map, or from a list), which colour when there's a choice, then where to. The map
// highlights the same choices.

const VOTE_NOTE = 'You add 1 of your cubes to the bag for each person who moves.'

const MOVEMENT_INTRO = `People move until nobody can: within a city into a Residence with at least 2 fewer people, and into a School city from a Residence elsewhere with more people. The most crowded Residence goes first, into the least crowded. ${VOTE_NOTE} These moves tie: choose who moves next.`

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

function ColorChoices({ picker }: { picker: PersonPicker }) {
  const byLook = useByLook()
  const colorNameOf = useColorNameOf()
  return (
    <div className="flex flex-wrap gap-2">
      {byLook(picker.colorsAtFrom).map(color => (
        <Button key={color} tone="secondary" onClick={() => picker.chooseColor(color)} className="flex items-center gap-2 px-3 py-2 text-sm">
          <CubeChip color={color} size={18} /> {colorNameOf(color)}
        </Button>
      ))}
    </div>
  )
}

/** Picks one person to move: where from, which colour if there's a choice, then where to. */
export function PersonChoices({ state, picker }: { state: VotesState; picker: PersonPicker }) {
  const describe = (key: HexKey) => describeHex(state, key)
  const colorNameOf = useColorNameOf()

  const describeDestination = (to: HexKey) => {
    return `${describe(to)} · ${countOf(peopleAt(state, to).length, 'person', 'people')} · +1 cube`
  }

  if (!picker.from) {
    const sources = [...new Set(picker.moves.map(move => move.from))]
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-ink-soft">{MOVEMENT_INTRO}</p>
        <ChoiceList keys={sources} describe={describe} onChoose={picker.chooseFrom} />
      </div>
    )
  }

  const back = (
    <Button tone="secondary" onClick={picker.reset}>
      Back
    </Button>
  )
  if (!picker.color) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm">Who moves from the {describe(picker.from)}?</p>
        <ColorChoices picker={picker} />
        {back}
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="flex items-center gap-2 text-sm">
        <CubeChip color={picker.color} size={18} />
        <span>
          Where does the <strong>{colorNameOf(picker.color)}</strong> person from the {describe(picker.from)} go?
        </span>
      </p>
      <ChoiceList keys={picker.destinations} describe={describeDestination} onChoose={picker.chooseDestination} />
      {back}
    </div>
  )
}
