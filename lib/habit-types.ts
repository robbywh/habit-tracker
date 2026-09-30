// Data model for the v1 habit tracker. See SPEC.md "Data Model".
// v1 is daily-only: no streaks, frequency, reminders, or stats.

/** Completion map keyed by local date string 'YYYY-MM-DD'. */
export type HabitCompletions = Record<string, boolean>;

export type Habit = {
  /** Unique id, generated locally (see lib/habit-id.ts). */
  id: string;
  name: string;
  /** Hex color, one of constants/habit-colors.ts HABIT_COLORS. */
  color: string;
  /** ISO 8601 timestamp of creation. */
  createdAt: string;
  completions: HabitCompletions;
};
