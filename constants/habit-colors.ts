// Fixed color palette for the habit color picker (SPEC.md Open Question 1:
// defaulting to a fixed palette of 6-8 swatches over a free color picker).

export const HABIT_COLORS = [
  '#EF4444', // red
  '#F97316', // orange
  '#EAB308', // yellow
  '#22C55E', // green
  '#0EA5E9', // sky blue
  '#6366F1', // indigo
  '#A855F7', // purple
  '#EC4899', // pink
] as const;

export type HabitColor = (typeof HABIT_COLORS)[number];

export const DEFAULT_HABIT_COLOR: HabitColor = HABIT_COLORS[0];

export function isHabitColor(value: string): value is HabitColor {
  return (HABIT_COLORS as readonly string[]).includes(value);
}
