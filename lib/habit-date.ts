// Local-date helpers for the v1 habit tracker.
// Completions are keyed by the LOCAL calendar date (not UTC), e.g. '2026-09-30'.

/** Returns `date` formatted as a local 'YYYY-MM-DD' string (no UTC conversion). */
export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Returns today's local date as a 'YYYY-MM-DD' string. */
export function getTodayDateKey(): string {
  return toDateKey(new Date());
}
