// AsyncStorage-backed persistence for the v1 habit tracker.
// One versioned key holds the full habit list as a JSON blob (SPEC.md
// Project Structure). Corrupt or missing data resolves to an empty list
// rather than throwing, so a bad blob can't brick the app on launch.

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Habit } from '@/lib/habit-types';

const STORAGE_KEY = '@habit-tracker/habits/v1';

export async function loadHabits(): Promise<Habit[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw === null) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  return Array.isArray(parsed) ? (parsed as Habit[]) : [];
}

export async function saveHabits(habits: Habit[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
}
