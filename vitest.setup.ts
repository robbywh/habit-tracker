import { vi } from 'vitest';

// Hand-rolled Vitest-compatible mock of @react-native-async-storage/async-storage.
// The official mock ships as a Jest mock (jest.config.js `async-storage/jest/async-storage-mock`);
// there is no Vitest equivalent, so this ports its in-memory get/set/remove behavior via `vi.mock`.
vi.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();

  return {
    default: {
      getItem: async (key: string): Promise<string | null> => (store.has(key) ? store.get(key)! : null),
      setItem: async (key: string, value: string): Promise<void> => {
        store.set(key, value);
      },
      removeItem: async (key: string): Promise<void> => {
        store.delete(key);
      },
      clear: async (): Promise<void> => {
        store.clear();
      },
    },
  };
});
