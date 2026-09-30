// Shared habits state for the v1 habit tracker.
//
// State lives in a React Context so every screen that calls `useHabits()`
// sees the same list and the same updates — there is no per-component copy.
// Mount `HabitsProvider` once, high enough that both the "Today" and "Manage
// Habits" screens (and the create/edit modals) are inside it — e.g. wrapping
// the root stack in `app/_layout.tsx`. This file does not touch `app/**`.
//
// STAGE 2: backed by `lib/habit-storage.ts` (AsyncStorage) — loads on mount
// (`isLoading` true until resolved) and persists after every mutation. The
// exported types and function signatures below are the contract other
// workstreams code against and do not change shape between stages.

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { getTodayDateKey } from '@/lib/habit-date';
import { generateHabitId } from '@/lib/habit-id';
import { loadHabits, saveHabits } from '@/lib/habit-storage';
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
  const [isLoading, setIsLoading] = useState(true);
  // Guards against persisting the empty initial state over whatever's
  // already on disk before the initial load has resolved.
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loadHabits().then((loaded) => {
      if (cancelled) return;
      hasLoadedRef.current = true;
      setHabits(loaded);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Persists on every change once the initial load has resolved.
  useEffect(() => {
    if (!hasLoadedRef.current) return;
    saveHabits(habits);
  }, [habits]);

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
