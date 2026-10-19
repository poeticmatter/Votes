import { Button } from 'game-kit/turns'
import type { HexKey } from '../../map/hexGrid'
import { peopleAt } from '../../rules/boardQueries'
import { votesForMove } from '../../rules/people'
import { RESIDENCE_CAPACITY, type VotesState } from '../../rules/types'
import { CubeChip, describeHex, useColorNameOf } from '../names'
import type { PersonPicker } from '../useTurnControls'
import { useByLook } from '../viewer'

// Moving one person, for a School's relocation or for housing: the active player picks
// where from (on the map, or from a list of Stations when housing), which colour when
// there's a choice, then where to. The map highlights the same choices.

const VOTE_NOTE =
  'You add 1 of your cubes to the bag for each person who moves in from within the same city, and none for one from a neighboring city.'

function relocationIntro(): string {
  return `Your School moves 1 person into one of the outlined Residences, even a full one, from its city or a neighboring city. ${VOTE_NOTE} Choose a Residence or Station on the map to take someone from.`
}

const HOUSING_INTRO = `People waiting at Stations move into Residences with space, within their city or from a neighboring city. ${VOTE_NOTE} Choose who moves in next.`

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
  const isHousing = state.phase.kind === 'housing'
  const intro = isHousing ? HOUSING_INTRO : relocationIntro()
  const describe = (key: HexKey) => describeHex(state, key)
  const colorNameOf = useColorNameOf()

  const describeDestination = (to: HexKey) => {
    const people = `${peopleAt(state, to).length}/${RESIDENCE_CAPACITY}`
    if (!picker.from) return `${describe(to)} · ${people}`
    return `${describe(to)} · ${people} · ${votesForMove(state, picker.from, to) === 0 ? 'no cube for you' : '+1 cube'}`
  }

  if (!picker.from) {
    const sources = [...new Set(picker.moves.map(move => move.from))]
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-ink-soft">{intro}</p>
        {isHousing && <ChoiceList keys={sources} describe={describe} onChoose={picker.chooseFrom} />}
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
