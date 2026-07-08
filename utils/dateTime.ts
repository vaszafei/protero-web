/**
 * Date/time helpers — all display in Europe/Athens (EEST UTC+3 / EET UTC+2).
 *
 * The app is Europe-centric. NBA games tip off in the middle of the night Athens
 * time, so their UTC calendar date can differ from the Athens calendar date.
 * Always use these helpers when deciding which "day" a game belongs to and when
 * showing times to the user.
 */

export const DISPLAY_TZ = 'Europe/Athens'

const _dtf = (opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: DISPLAY_TZ, ...opts })

/**
 * Returns the YYYY-MM-DD date string for any Date or ISO string, in Athens time.
 * e.g. a game stored as "2026-04-14 23:30 UTC" → "2026-04-15" (Athens is UTC+3).
 */
export function toAthensDateStr(date: Date | string): string {
  return _dtf({ year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    typeof date === 'string' ? new Date(date) : date
  )
}

/**
 * Today's YYYY-MM-DD in Athens time.
 */
export function todayAthensStr(): string {
  return toAthensDateStr(new Date())
}

/**
 * Formats a game time as HH:MM in Athens time (24-hour).
 * e.g. "2026-04-14 23:30 UTC" → "02:30"
 */
export function toAthensTimeStr(date: Date | string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: DISPLAY_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(typeof date === 'string' ? new Date(date) : date)
}

/**
 * Formats a date as "Mon, Apr 14" in Athens time.
 */
export function toAthensLongDateStr(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: DISPLAY_TZ,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(typeof date === 'string' ? new Date(date) : date)
}

/**
 * Formats a date as "Mon, Apr 14, 2026" in Athens time.
 */
export function toAthensFullDateStr(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: DISPLAY_TZ,
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(typeof date === 'string' ? new Date(date) : date)
}
