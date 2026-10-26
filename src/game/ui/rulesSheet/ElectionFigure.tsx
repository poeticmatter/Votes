import type { ReactNode } from 'react'
import { PLAYER_COLORS, type CubeColor, type ElectionResult, type PlayerColor, type SeatResult } from '../../rules/types'
import { HouseGlyph, PlaceGlyph } from '../map/glyphs'
import { COLORS, FONT_FAMILY } from '../theme'
import { usePieceColorOf } from '../viewer'
import { ELECTION_EXAMPLE } from './examples'

// The election example as a table: one row per Residence in the merged city, showing
// its people and who takes its seat, then the city's seats and value, and what each seat
// pays. Ported from the asset generator's src/rules/ElectionFigure.jsx.

const VIEW_WIDTH = 300
const HEADER_Y = 10
const FIRST_ROW_Y = 36
const ROW_HEIGHT = 32
const CUBE = { size: 16, pitch: 19 }
const COLUMNS = { town: 0, house: 28, cubes: 50, chip: 146, note: 226 }
const CHIP = { width: 74, height: 24 }
const HOUSE_SIZE = 24
const SEAT_DISC = { firstX: 56, pitch: 22, radius: 9 }
const PAYOUT_ROW_GAP = 28
const CUBE_OUTLINE = 'rgba(0, 0, 0, 0.45)'

const TEXT = { fontFamily: FONT_FAMILY, dominantBaseline: 'central' } as const

function SeatChip({ x, y, seat }: { x: number; y: number; seat: SeatResult }) {
  const pieceColorOf = usePieceColorOf()
  const winner = seat.winner ? pieceColorOf(seat.winner) : null
  return (
    <g>
      <rect
        x={x}
        y={y - CHIP.height / 2}
        width={CHIP.width}
        height={CHIP.height}
        rx={CHIP.height / 2}
        fill={winner?.fill ?? COLORS.paper}
        stroke={winner ? 'none' : COLORS.rule}
        strokeWidth={2}
      />
      <text {...TEXT} x={x + CHIP.width / 2} y={y} textAnchor="middle" fontSize={13} fontWeight={700} fill={winner?.ink ?? COLORS.inkSoft}>
        {winner?.name ?? 'Nobody'}
      </text>
    </g>
  )
}

function ResidenceRow({ seat, seatNumber, y }: { seat: SeatResult; seatNumber: number; y: number }) {
  const pieceColorOf = usePieceColorOf()
  const note = seat.reason === 'leftmostOfTie' ? 'tie: leftmost' : seat.reason === 'empty' ? 'empty' : null
  return (
    <g>
      <text {...TEXT} x={COLUMNS.town} y={y} fontSize={15} fontWeight={800} fill={COLORS.inkSoft}>
        {seatNumber}
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

const SummaryLabel = ({ y, children }: { y: number; children: ReactNode }) => (
  <text {...TEXT} x={0} y={y} fontSize={13} fontWeight={700} fill={COLORS.inkFaint}>
    {children}
  </text>
)

const SummaryValue = ({ y, children }: { y: number; children: ReactNode }) => (
  <text {...TEXT} x={VIEW_WIDTH} y={y} textAnchor="end" fontSize={15} fontWeight={700} fill={COLORS.ink}>
    {children}
  </text>
)

/** A seat in its holder's colour, or hollow when nobody holds it. */
function SeatDisc({ x, y, color }: { x: number; y: number; color: CubeColor | null }) {
  const pieceColorOf = usePieceColorOf()
  return (
    <circle
      cx={x}
      cy={y}
      r={SEAT_DISC.radius}
      fill={color ? pieceColorOf(color).fill : COLORS.paper}
      stroke={color ? CUBE_OUTLINE : COLORS.rule}
      strokeWidth={color ? 1 : 2}
    />
  )
}

/** Who scores, most first, e.g. "Cobalt +4, Saffron +2". */
function useScoresLabel(): (result: ElectionResult) => string {
  const pieceColorOf = usePieceColorOf()
  return ({ scores }) => {
    const pointsOf = (color: PlayerColor) => scores[color] ?? 0
    const ranked = PLAYER_COLORS.filter(color => pointsOf(color) > 0).sort((a, b) => pointsOf(b) - pointsOf(a))
    if (ranked.length === 0) return 'Nobody scores'
    return ranked.map(color => `${pieceColorOf(color).name} +${pointsOf(color)}`).join(', ')
  }
}

export function ElectionFigure() {
  const scoresLabel = useScoresLabel()
  const { result } = ELECTION_EXAMPLE
  const cityY = FIRST_ROW_Y + result.seats.length * ROW_HEIGHT + 30
  const payoutY = cityY + PAYOUT_ROW_GAP
  const viewHeight = payoutY + 20
  const winners = result.seats.flatMap(seat => (seat.winner ? [seat.winner] : []))
  const seatsOf = (color: CubeColor) => result.seatsByColor[color] ?? 0
  // Held seats grouped by colour, most seats first, empty ones last.
  const heldSeats = [...winners].sort((a, b) => seatsOf(b) - seatsOf(a) || winners.indexOf(a) - winners.indexOf(b))
  const emptySeats = result.seats.filter(seat => !seat.winner).map(() => null)
  const seatDiscs = [...heldSeats, ...emptySeats]
  const payout = scoresLabel(result)

  return (
    <svg viewBox={`0 0 ${VIEW_WIDTH} ${viewHeight}`} className="block h-auto w-full" role="img" aria-label={`Election: ${payout}`}>
      <ColumnHeader x={COLUMNS.town} label="SEAT" />
      <ColumnHeader x={COLUMNS.cubes} label="PEOPLE" />
      <ColumnHeader x={COLUMNS.chip} label="WON BY" />
      {result.seats.map((seat, index) => (
        <ResidenceRow key={seat.residence} seat={seat} seatNumber={index + 1} y={FIRST_ROW_Y + index * ROW_HEIGHT} />
      ))}
      <line x1={0} x2={VIEW_WIDTH} y1={cityY - 22} y2={cityY - 22} stroke={COLORS.rule} strokeWidth={2} />
      <SummaryLabel y={cityY}>CITY</SummaryLabel>
      {/* Seats are discs here; squares in the rows above are cubes. */}
      {seatDiscs.map((color, index) => (
        <SeatDisc key={`${color}-${index}`} x={SEAT_DISC.firstX + index * SEAT_DISC.pitch} y={cityY} color={color} />
      ))}
      <SummaryValue y={cityY}>Worth {result.cityValue}</SummaryValue>
      <SummaryLabel y={payoutY}>{result.pointsPerSeat} PER SEAT</SummaryLabel>
      <SummaryValue y={payoutY}>{payout}</SummaryValue>
    </svg>
  )
}
