import { bandLabels, PAYOUT_ROWS, SEAT_BAND_MINIMUMS } from '../../rules/payout'

// The payout table, read from the same rows the elections use: points per seat, by the
// city's value (rows) and its number of seats (columns).

const VALUE_LABELS = bandLabels(PAYOUT_ROWS.map(row => row.minimumValue))
const SEAT_LABELS = bandLabels(SEAT_BAND_MINIMUMS)

export function PayoutTable() {
  return (
    <table className="mt-2 w-full max-w-[420px] border-collapse text-center tabular-nums">
      <caption className="mb-1 text-left text-ink-soft">Points per seat</caption>
      <thead>
        <tr className="border-b-2 border-ink">
          <th scope="col" className="py-1 pr-2 text-left font-bold">
            City value
          </th>
          {SEAT_LABELS.map(label => (
            <th key={label} scope="col" className="px-2 py-1 font-bold">
              {label} seats
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {PAYOUT_ROWS.map((row, index) => (
          <tr key={row.minimumValue} className="border-b border-rule">
            <th scope="row" className="py-1 pr-2 text-left font-semibold">
              {VALUE_LABELS[index]}
            </th>
            {row.pointsPerSeat.map((points, column) => (
              <td key={SEAT_LABELS[column]} className="px-2 py-1">
                {points}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
