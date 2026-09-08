const TIME_UNIT_IN_SECONDS = {
  second: 1,
  minute: 60,
  hour: 60 * 60,
  day: 24 * 60 * 60,
  week: 7 * 24 * 60 * 60
} as const

export type TimeUnit = keyof typeof TIME_UNIT_IN_SECONDS

export const toSeconds = (value: number, unit: TimeUnit): number => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError('Duration must be a positive finite number.')
  }

  return Math.trunc(value * TIME_UNIT_IN_SECONDS[unit])
}
