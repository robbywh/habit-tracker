import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, describe, expect, it } from 'vitest';

import { HabitsProvider, useHabits, type UseHabitsResult } from '@/hooks/use-habits';
import { loadHabits, saveHabits } from '@/lib/habit-storage';
import type { Habit } from '@/lib/habit-types';

// Hand-rolled `renderHook`-equivalent: `@testing-library/react-native` isn't a
// project dependency (see SPEC.md Testing Strategy / Boundaries — it's an
// "ask first" addition), so this mounts a probe component under
// `HabitsProvider` and captures the hook's return value on every render.
function renderHabitsHook() {
  const ref: { current: UseHabitsResult | null } = { current: null };

  function Probe() {
    ref.current = useHabits();
    return null;
  }

  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(
      <HabitsProvider>
        <Probe />
      </HabitsProvider>
    );
  });

  return {
    get current(): UseHabitsResult {
      if (!ref.current) throw new Error('useHabits() did not render a value');
      return ref.current;
    },
    unmount: () => act(() => renderer.unmount()),
  };
}

beforeEach(async () => {
  await saveHabits([]);
});

describe('HabitsProvider (Stage 2: AsyncStorage-backed)', () => {
  it('starts loading and resolves once persisted habits are read', async () => {
    const hook = renderHabitsHook();
    expect(hook.current.isLoading).toBe(true);

    await act(async () => {});

    expect(hook.current.isLoading).toBe(false);
    expect(hook.current.habits).toEqual([]);
  });

  it('loads previously persisted habits on mount', async () => {
    const existing: Habit = {
      id: 'existing-1',
      name: 'Read',
      color: '#22C55E',
      createdAt: '2026-01-01T00:00:00.000Z',
      completions: {},
    };
    await saveHabits([existing]);

    const hook = renderHabitsHook();
    await act(async () => {});

    expect(hook.current.habits).toEqual([existing]);
  });

  it('persists a created habit so a fresh provider instance loads it', async () => {
    const hook = renderHabitsHook();
    await act(async () => {});

    await act(async () => {
      await hook.current.create({ name: 'Meditate', color: '#6366F1' });
    });

    expect(hook.current.habits).toHaveLength(1);
    expect(hook.current.habits[0].name).toBe('Meditate');

    const persisted = await loadHabits();
    expect(persisted).toHaveLength(1);

    const secondMount = renderHabitsHook();
    await act(async () => {});
    expect(secondMount.current.habits).toEqual(persisted);
  });

  it('persists update, toggleToday, and remove', async () => {
    const hook = renderHabitsHook();
    await act(async () => {});

    let created!: Habit;
    await act(async () => {
      created = await hook.current.create({ name: 'Stretch', color: '#EAB308' });
    });

    await act(async () => {
      await hook.current.update(created.id, { name: 'Stretch daily' });
    });
    expect(hook.current.habits[0].name).toBe('Stretch daily');

    await act(async () => {
      await hook.current.toggleToday(created.id);
    });
    expect(hook.current.isDoneToday(hook.current.habits[0])).toBe(true);

    const afterToggle = await loadHabits();
    expect(afterToggle[0].completions).not.toEqual({});

    await act(async () => {
      await hook.current.remove(created.id);
    });
    expect(hook.current.habits).toEqual([]);
    expect(await loadHabits()).toEqual([]);
  });

  it('update and toggleToday only affect the targeted habit', async () => {
    const hook = renderHabitsHook();
    await act(async () => {});

    let first!: Habit;
    let second!: Habit;
    await act(async () => {
      first = await hook.current.create({ name: 'Stretch', color: '#EAB308' });
      second = await hook.current.create({ name: 'Journal', color: '#A855F7' });
    });

    await act(async () => {
      await hook.current.update(first.id, { name: 'Stretch daily' });
    });
    const [updatedFirst, untouchedSecond] = hook.current.habits;
    expect(updatedFirst.name).toBe('Stretch daily');
    expect(untouchedSecond).toEqual(second);

    await act(async () => {
      await hook.current.toggleToday(first.id);
    });
    const [toggledFirst, stillUntouchedSecond] = hook.current.habits;
    expect(hook.current.isDoneToday(toggledFirst)).toBe(true);
    expect(hook.current.isDoneToday(stillUntouchedSecond)).toBe(false);
  });

  it('update/remove are no-ops for an unknown habit id', async () => {
    const hook = renderHabitsHook();
    await act(async () => {});

    await act(async () => {
      await hook.current.update('unknown-id', { name: 'Nope' });
      await hook.current.remove('unknown-id');
    });

    expect(hook.current.habits).toEqual([]);
  });

  it('does not update state if unmounted before the initial load resolves', async () => {
    const hook = renderHabitsHook();
    expect(hook.current.isLoading).toBe(true);

    act(() => {
      hook.unmount();
    });

    // Flush the in-flight loadHabits() promise; the effect cleanup should
    // have marked it cancelled so it's a no-op instead of a state update on
    // an unmounted component.
    await act(async () => {});
  });

  it('throws when useHabits() is called outside a HabitsProvider', () => {
    function Probe() {
      useHabits();
      return null;
    }

    expect(() => {
      act(() => {
        create(<Probe />);
      });
    }).toThrow('useHabits() must be used within a <HabitsProvider>.');
  });
});
