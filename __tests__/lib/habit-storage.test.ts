import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeEach, describe, expect, it } from 'vitest';

import type { Habit } from '@/lib/habit-types';
import { loadHabits, saveHabits } from '@/lib/habit-storage';

const sampleHabit: Habit = {
  id: 'habit-1',
  name: 'Drink water',
  color: '#0EA5E9',
  createdAt: '2026-01-01T00:00:00.000Z',
  completions: { '2026-01-01': true },
};

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('loadHabits', () => {
  it('returns an empty array when nothing has been stored yet', async () => {
    expect(await loadHabits()).toEqual([]);
  });

  it('returns an empty array when the stored value is not valid JSON', async () => {
    await AsyncStorage.setItem('@habit-tracker/habits/v1', 'not json');
    expect(await loadHabits()).toEqual([]);
  });

  it('returns an empty array when the stored value is not an array', async () => {
    await AsyncStorage.setItem('@habit-tracker/habits/v1', JSON.stringify({ not: 'an array' }));
    expect(await loadHabits()).toEqual([]);
  });

  it('round-trips habits saved via saveHabits', async () => {
    await saveHabits([sampleHabit]);
    expect(await loadHabits()).toEqual([sampleHabit]);
  });
});

describe('saveHabits', () => {
  it('overwrites any previously saved habits', async () => {
    await saveHabits([sampleHabit]);
    await saveHabits([]);
    expect(await loadHabits()).toEqual([]);
  });
});
