import type { SeatReason, SeatResult } from '../../rules/types'
import { HouseGlyph, PlaceGlyph } from '../map/glyphs'
import { COLORS, FONT_FAMILY } from '../theme'
import { usePieceColorOf } from '../viewer'
import { ELECTION_EXAMPLE } from './examples'

// The election example as a table: one row per Residence in the merged city, showing
// its people and who takes its seat, then the city's seats and payout. Ported from the
// asset generator's src/rules/ElectionFigure.jsx.

const VIEW_WIDTH = 300
const HEADER_Y = 10
const FIRST_ROW_Y = 36
const ROW_HEIGHT = 32
const CUBE = { size: 16, pitch: 19 }
const COLUMNS = { town: 0, house: 28, cubes: 50, chip: 146, note: 226 }
const CHIP = { width: 74, height: 24 }
const HOUSE_SIZE = 24
const SEAT_DISC = { firstX: 56, pitch: 22, radius: 9 }
const CUBE_OUTLINE = 'rgba(0, 0, 0, 0.45)'

const TEXT = { fontFamily: FONT_FAMILY, dominantBaseline: 'central' } as const

const TIE_NOTES: Record<SeatReason, string | null> = {
  mostPeople: null,
  tieToGrey: 'tie: grey',
}

function SeatChip({ x, y, seat }: { x: number; y: number; seat: SeatResult }) {
  const color = usePieceColorOf()(seat.winner)
  return (
    <g>
      <rect x={x} y={y - CHIP.height / 2} width={CHIP.width} height={CHIP.height} rx={CHIP.height / 2} fill={color.fill} />
      <text {...TEXT} x={x + CHIP.width / 2} y={y} textAnchor="middle" fontSize={13} fontWeight={700} fill={color.ink}>
        {color.name}
      </text>
    </g>
  )
}

function ResidenceRow({ seat, y }: { seat: SeatResult; y: number }) {
  const pieceColorOf = usePieceColorOf()
  const note = seat.people.length ? TIE_NOTES[seat.reason] : 'empty: grey'
  return (
    <g>
      <text {...TEXT} x={COLUMNS.town} y={y} fontSize={15} fontWeight={800} fill={COLORS.inkSoft}>
        {seat.town}
      </text>
      <PlaceGlyph center={{ x: COLUMNS.house, y }} size={HOUSE_SIZE}>
        <HouseGlyph size={HOUSE_SIZE} color={COLORS.ink} />
      </PlaceGlyph>
      {seat.people.map((color, index) => (
        <rect
          key={`${index}-${color}`}
          x={COLUMNS.cubes + index * CUBE.pitch}
          y={y - CUBE.size / 2}
          width={CUBE.size}
          height={CUBE.size}
          rx={3}
          fill={pieceColorOf(color).fill}
          stroke={CUBE_OUTLINE}
          strokeWidth={1}
        />
      ))}
      <SeatChip x={COLUMNS.chip} y={y} seat={seat} />
      {note && (
        <text {...TEXT} x={COLUMNS.note} y={y} fontSize={11.5} fill={COLORS.inkSoft}>
          {note}
        </text>
      )}
    </g>
  )
}

const ColumnHeader = ({ x, label }: { x: number; label: string }) => (
  <text {...TEXT} x={x} y={HEADER_Y} fontSize={11} fontWeight={700} letterSpacing={1} fill={COLORS.inkFaint}>
    {label}
  </text>
)

export function ElectionFigure() {
  const pieceColorOf = usePieceColorOf()
  const { result } = ELECTION_EXAMPLE
  const cityY = FIRST_ROW_Y + result.seats.length * ROW_HEIGHT + 30
  const viewHeight = cityY + 20
  const ranked = Object.entries(result.seatsByColor).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
  const seatDiscs = result.seats
    .map(seat => seat.winner)
    .sort((a, b) => ranked.findIndex(([color]) => color === a) - ranked.findIndex(([color]) => color === b))
  const scorerNames = result.scorers.map(color => pieceColorOf(color).name).join(', ')
  const payout = result.scorers.length
    ? `${scorerNames} +${result.factoryPoints}${result.scorers.length > 1 ? ' each' : ''}`
    : 'Nobody scores'

  return (
    <svg viewBox={`0 0 ${VIEW_WIDTH} ${viewHeight}`} className="block h-auto w-full" role="img" aria-label={`Election: ${payout}`}>
      <ColumnHeader x={COLUMNS.town} label="SEAT" />
      <ColumnHeader x={COLUMNS.cubes} label="PEOPLE" />
      <ColumnHeader x={COLUMNS.chip} label="WON BY" />
      {result.seats.map((seat, index) => (
        <ResidenceRow key={seat.residence} seat={seat} y={FIRST_ROW_Y + index * ROW_HEIGHT} />
      ))}
      <line x1={0} x2={VIEW_WIDTH} y1={cityY - 22} y2={cityY - 22} stroke={COLORS.rule} strokeWidth={2} />
      <text {...TEXT} x={0} y={cityY} fontSize={13} fontWeight={700} fill={COLORS.inkFaint}>
        CITY
      </text>
      {/* Seats are discs here; squares in the rows above are cubes. */}
      {seatDiscs.map((color, index) => (
        <circle
          key={`${color}-${index}`}
          cx={SEAT_DISC.firstX + index * SEAT_DISC.pitch}
          cy={cityY}
          r={SEAT_DISC.radius}
          fill={pieceColorOf(color).fill}
          stroke={CUBE_OUTLINE}
          strokeWidth={1}
        />
      ))}
      <text {...TEXT} x={VIEW_WIDTH} y={cityY} textAnchor="end" fontSize={15} fontWeight={700} fill={COLORS.ink}>
        {payout}
      </text>
    </svg>
  )
}
