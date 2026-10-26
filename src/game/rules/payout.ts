// The election payout table from the rules: points per seat, by the city's total
// Factory and Mine value (rows) and its number of seats (columns). Each band starts at
// its minimum and runs up to the next one's.

export const SEAT_BAND_MINIMUMS: readonly number[] = [2, 4, 7, 11]

export interface PayoutRow {
  minimumValue: number
  /** One entry per seat band. */
  pointsPerSeat: readonly number[]
}

export const PAYOUT_ROWS: readonly PayoutRow[] = [
  { minimumValue: 1, pointsPerSeat: [1, 1, 1, 1] },
  { minimumValue: 5, pointsPerSeat: [2, 2, 1, 1] },
  { minimumValue: 10, pointsPerSeat: [4, 3, 2, 1] },
  { minimumValue: 17, pointsPerSeat: [5, 3, 3, 2] },
  { minimumValue: 25, pointsPerSeat: [6, 4, 3, 2] },
]

/** "2–3", "4–6", …, "11+": each band's range, from the band minimums. */
export function bandLabels(minimums: readonly number[]): string[] {
  return minimums.map((minimum, index) => {
    const next = minimums[index + 1]
    return next === undefined ? `${minimum}+` : `${minimum}–${next - 1}`
  })
}

/** The band `amount` falls in: the last one starting at or below it, or the first if it's below them all. */
function bandIndex(minimums: readonly number[], amount: number): number {
  const below = minimums.filter(minimum => minimum <= amount).length
  return Math.max(0, below - 1)
}

/**
 * Every merged city holds at least two starting Residences, so only a lone town has
 * fewer seats than the table's first column; it never votes, but the cities panel
 * previews it as if it were in that column.
 */
export function pointsPerSeat(cityValue: number, seatCount: number): number {
  // A city with no Factories or Mines pays nothing; the table starts at 1.
  if (cityValue === 0) return 0
  const column = bandIndex(SEAT_BAND_MINIMUMS, seatCount)
  const row = PAYOUT_ROWS[bandIndex(PAYOUT_ROWS.map(candidate => candidate.minimumValue), cityValue)]
  return row.pointsPerSeat[column]
}
