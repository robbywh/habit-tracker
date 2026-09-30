// Shared habits state for the v1 habit tracker.
//
// STAGE 1 (current): in-memory stub. State lives in a React Context so every
// screen that calls `useHabits()` sees the same list and the same updates —
// there is no per-component copy. `mobile-developer`: mount `HabitsProvider`
// once, high enough that both the "Today" and "Manage Habits" screens (and
// the create/edit modals) are inside it — e.g. wrapping the root stack in
// `app/_layout.tsx`. This file does not touch `app/**`.
//
// STAGE 2 (follow-up): the body of `HabitsProvider` will load/persist via
// `lib/habit-storage.ts` (AsyncStorage) behind this exact same public API.
// The exported types and function signatures below are the contract other
// workstreams code against and will not change shape.

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { getTodayDateKey } from '@/lib/habit-date';
import { generateHabitId } from '@/lib/habit-id';
import type { Habit } from '@/lib/habit-types';

export type CreateHabitInput = {
  name: string;
  color: string;
};

export type UpdateHabitInput = Partial<CreateHabitInput>;

export type UseHabitsResult = {
  /** All habits, in creation order. */
  habits: Habit[];
  /** True while the persisted list is being read (Stage 2: AsyncStorage). */
  isLoading: boolean;
  /** Creates a habit and returns it once it's part of `habits`. */
  create: (input: CreateHabitInput) => Promise<Habit>;
  /** Patches a habit's name and/or color. No-op if `id` is unknown. */
  update: (id: string, input: UpdateHabitInput) => Promise<void>;
  /** Removes a habit. No-op if `id` is unknown. */
  remove: (id: string) => Promise<void>;
  /** Toggles today's (local date) completion for a habit. */
  toggleToday: (id: string) => Promise<void>;
  /** Convenience read: is `habit` marked done for today's local date? */
  isDoneToday: (habit: Habit) => boolean;
};

const HabitsContext = createContext<UseHabitsResult | undefined>(undefined);

/**
 * Mount once near the root of the app (inside `app/_layout.tsx`) so every
 * screen under it shares one habits list. Do not mount more than one
 * instance, or screens under different instances will disagree.
 */
export function HabitsProvider({ children }: { children: ReactNode }) {
  const [habits, setHabits] = useState<Habit[]>([]);
  // Stage 1 stub holds everything in memory synchronously, so there is
  // nothing to await on mount. Stage 2 will flip this to `true` until the
  // initial AsyncStorage read resolves.
  const [isLoading] = useState(false);

  const create = useCallback(async (input: CreateHabitInput): Promise<Habit> => {
    const habit: Habit = {
      id: generateHabitId(),
      name: input.name,
      color: input.color,
      createdAt: new Date().toISOString(),
      completions: {},
    };
    setHabits((current) => [...current, habit]);
    return habit;
  }, []);

  const update = useCallback(async (id: string, input: UpdateHabitInput): Promise<void> => {
    setHabits((current) =>
      current.map((habit) => (habit.id === id ? { ...habit, ...input } : habit))
    );
  }, []);

  const remove = useCallback(async (id: string): Promise<void> => {
    setHabits((current) => current.filter((habit) => habit.id !== id));
  }, []);

  const toggleToday = useCallback(async (id: string): Promise<void> => {
    const today = getTodayDateKey();
    setHabits((current) =>
      current.map((habit) =>
        habit.id === id
          ? {
              ...habit,
              completions: {
                ...habit.completions,
                [today]: !habit.completions[today],
              },
            }
          : habit
      )
    );
  }, []);

  const isDoneToday = useCallback((habit: Habit): boolean => {
    return Boolean(habit.completions[getTodayDateKey()]);
  }, []);

  const value = useMemo<UseHabitsResult>(
    () => ({ habits, isLoading, create, update, remove, toggleToday, isDoneToday }),
    [habits, isLoading, create, update, remove, toggleToday, isDoneToday]
  );

  // Plain `createElement` (no JSX) since this is a `.ts` file per SPEC.md's
  // Project Structure (`hooks/use-habits.ts`), not `.tsx`.
  return createElement(HabitsContext.Provider, { value }, children);
}

/** Must be called from within a `HabitsProvider`. */
export function useHabits(): UseHabitsResult {
  const context = useContext(HabitsContext);
  if (!context) {
    throw new Error('useHabits() must be used within a <HabitsProvider>.');
  }
  return context;
}
