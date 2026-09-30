# Spec: Habit Tracker (v1)

## Objective

A mobile habit tracker built with Expo. The user creates habits they want to
do every day and checks them off as completed. Success for v1 is: a user can
add a habit, see it in a daily list, mark it done/undone, edit its name or
delete it — all persisted across app restarts, fully offline.

Out of scope for v1 (explicitly deferred, not forgotten):
- Streaks / history / heatmaps
- Reminders & notifications
- Stats / insights dashboard
- Cloud sync or accounts

## Tech Stack

- Expo SDK 57, Expo Router (file-based routing in `app/`)
- React 19 / React Native 0.86
- NativeWind v4 + Tailwind (`className` styling) for all new UI
- `@react-native-async-storage/async-storage` for local persistence (installed via `npx expo install`)
- TypeScript, strict mode (already configured in `tsconfig.json`)
- Vitest for unit and integration tests (see "Testing Strategy" — chosen over
  `jest-expo` by explicit user decision; there is no official Vitest preset
  for React Native/Expo, so this is a hand-rolled setup, not the SDK-supported
  path)

**Assumption:** AsyncStorage (simple JSON blob) is sufficient for v1 — there's
no relational querying need yet. If history/streak features land later,
revisit whether `expo-sqlite` is warranted. Flag this in review if you disagree.

## Commands

```
Dev (all):    bun expo start          (or: npx expo start)
Dev (iOS):    bun expo start --ios
Dev (Android):bun expo start --android
Lint:         npx expo lint
Typecheck:    npx tsc --noEmit
Doctor:       npx expo-doctor
Test:         bun run test  (vitest, once configured — see Testing Strategy)
```

Always use `npx expo install <package>` (never `bun add` / `npm install`) for
any new dependency, per `AGENTS.md`.

## Project Structure

Routes stay in `app/`; everything else (state, storage, types, components)
lives outside it, per the existing `AGENTS.md` rule.

```
app/
  (tabs)/
    index.tsx          → "Today" screen: list of habits with check-off toggle
    two.tsx            → repurpose as "Manage Habits" screen (list + delete + edit entry)
    _layout.tsx         → existing tab navigator (rename tab labels/icons)
  habit/
    new.tsx            → create-habit screen (modal presentation)
    [id]/edit.tsx      → edit-habit screen (modal presentation)
  _layout.tsx           → existing root stack (register habit/* modal routes)

components/
  habit/
    habit-list-item.tsx   → row: name + checkbox, tap toggles today's completion
    habit-form.tsx        → shared form for create/edit (name, color)
  ui/                      → generic pieces reused beyond habits (e.g. Checkbox)

lib/
  habit-storage.ts        → AsyncStorage read/write, versioned key, JSON (de)serialize
  habit-types.ts          → Habit, HabitCompletions types

hooks/
  use-habits.ts           → habits state + create/update/delete/toggleToday, backed by lib/habit-storage

constants/
  Colors.ts               → existing
  habit-colors.ts          → fixed palette for habit color picker

__tests__/
  lib/habit-storage.test.ts
  hooks/use-habits.test.ts
```

Existing files not touched by this spec: `components/edit-screen-info.tsx`,
`components/external-link.tsx`, `components/styled-text.tsx`,
`components/themed.tsx` (StyleSheet-based) — new screens use NativeWind
instead of `themed.tsx`; remove `themed.tsx` usages only where a screen is
being rewritten, don't do a drive-by migration of untouched files.

## Data Model

```ts
// lib/habit-types.ts
export type Habit = {
  id: string;            // uuid
  name: string;
  color: string;         // hex, from constants/habit-colors.ts palette
  createdAt: string;     // ISO date
  completions: Record<string, boolean>; // key: 'YYYY-MM-DD', local date
};
```

**Assumption:** v1 habits are daily-only (no custom weekday frequency) — the
"frequency" concept is deferred alongside streaks. Flag if you want per-weekday
scheduling in v1.

## Code Style

NativeWind `className` for all new/rewritten screens and components; no
`StyleSheet.create` in new code. Named function components, default export
only for route files (Expo Router requirement).

```tsx
// components/habit/habit-list-item.tsx
import { Pressable, Text, View } from 'react-native';

import type { Habit } from '@/lib/habit-types';

type Props = {
  habit: Habit;
  done: boolean;
  onToggle: (id: string) => void;
};

export function HabitListItem({ habit, done, onToggle }: Props) {
  return (
    <Pressable
      onPress={() => onToggle(habit.id)}
      className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800"
    >
      <Text className="text-base text-gray-900 dark:text-gray-100">{habit.name}</Text>
      <View
        className={`h-6 w-6 rounded-full border-2 ${done ? 'bg-green-500 border-green-500' : 'border-gray-400'}`}
      />
    </Pressable>
  );
}
```

- Storage/hook functions: plain `async function`, no classes.
- Types via `type`, not `interface`, matching the snippet above.
- Path alias `@/*` (already configured) for all cross-folder imports.

## Testing Strategy

No test runner is configured yet — this spec introduces one.

**Explicit deviation from Expo's recommended stack:** Expo SDK 57 officially
recommends `jest-expo` for unit testing — there is no supported Vitest preset
for React Native (no native-module mock registry, no Metro/Flow-aware
transform). The user explicitly chose Vitest anyway, accepting that hitting
an unsupported edge case (a native module without a manual mock, a transform
gap) means working around it ad hoc rather than falling back to jest-expo.
Do not silently swap back to jest-expo if you hit friction — report the
blocker instead.

- Add `vitest` (plus `@vitest/coverage-v8` for coverage) as dev dependencies,
  installed via `npx expo install` where the package is Expo-aware, otherwise
  ask first per Boundaries. Configure a Babel or SWC transform capable of
  handling React Native's JSX/Flow-typed sources (e.g. via `vite-tsconfig-paths`
  plus a React Native-aware transform plugin, or `babel-preset-expo` driven
  through a custom Vitest transform) — there is no drop-in preset, so this
  needs to be assembled by hand.
- Provide a manual `@react-native-async-storage/async-storage` mock for
  Vitest (the official mock ships as a Jest mock; port its behavior to a
  Vitest-compatible module mock via `vi.mock`).
- Unit- and integration-test `lib/habit-storage.ts` (read/write/migrate) and
  `hooks/use-habits.ts` (CRUD + toggle logic, using `@testing-library/react-native`'s
  `renderHook` if it works under Vitest, or a minimal hand-rolled hook-test
  harness if it doesn't) — these hold all the real logic.
- No unit tests for route components (`app/**`) — verify those manually via
  Argent (simulator tap-through) per `AGENTS.md` / the `argent` rule, since
  they're thin wrappers over the hook + components.
- Coverage target: 100% of `lib/` and `hooks/`, not enforced app-wide.

## Implementation Team & Model Routing

v1 implementation is split into three parallelizable subagent workstreams,
defined in `.claude/agents/`:

- `backend-developer` — owns `lib/habit-types.ts`, `lib/habit-storage.ts`,
  `hooks/use-habits.ts`, `constants/habit-colors.ts`. Runs first, alone; must
  publish the `Habit` type and the `use-habits` hook's exact public API
  (create/update/delete/toggleToday signatures) before the other two start.
- `mobile-developer` — owns `app/(tabs)/*`, `app/habit/*`, `app/_layout.tsx`,
  `components/habit/*`, `components/ui/*`. Blocked until `backend-developer`
  publishes its API; from then on runs in parallel with `qa`.
- `qa` — owns the Vitest setup and `__tests__/lib/*`,
  `__tests__/hooks/*`. Same precondition and parallel window as `mobile-developer`.

Each agent edits only its own listed files, never another workstream's files
or `ios/`/`android/`, and asks first before adding a dependency or changing
the `Habit` shape (see Boundaries below) — each agent's own `.md` definition
carries the full file list and rules.

**Model routing requirement:** before dispatching any of these three agents,
classify that specific task with Jev (`typesafe/jev-1.13`, question: "what's
the smallest model that can do this job well?") and pass the resulting model
as an override on that dispatch — tiny → Haiku 4.5, everyday → Sonnet 5,
large → Opus 5.5, hardest → Fable 5.1. Do this live, per dispatch; do not
hardcode a model into an agent's frontmatter. Only trust Jev's answer at
confidence ≥ 0.8 — below that, default to Sonnet 5 and say so. If the Jev
call itself errors or times out, default to Sonnet 5 and say so.

## Boundaries

- **Always:**
  - Run `npx expo lint` and `npx tsc --noEmit` before declaring any task done (per `AGENTS.md`).
  - Use `npx expo install` for new packages, never `npm`/`yarn`/`bun add`.
  - Keep route files in `app/` thin; logic lives in `lib/`/`hooks/`.
- **Ask first:**
  - Adding any dependency not already in `package.json` (e.g. AsyncStorage, Vitest, RTL).
  - Changing the `Habit` data shape once it's implemented (needs a migration path in `habit-storage.ts`).
- **Never:**
  - Hand-edit `ios/` or `android/` — native config changes go through `app.json` / config plugins (CNG).
  - Introduce a backend, auth, or cloud sync in v1.

## Success Criteria

- [ ] User can create a habit (name + color) from the "Manage Habits" screen.
- [ ] New habit appears immediately on the "Today" screen.
- [ ] Tapping a habit on "Today" toggles its completion for today's date and persists across app restart.
- [ ] User can edit a habit's name/color.
- [ ] User can delete a habit (with confirmation), removing it from both screens.
- [ ] All state survives a full app kill + relaunch (AsyncStorage-backed).
- [ ] `npx expo lint` and `npx tsc --noEmit` pass with no errors.
- [ ] `lib/` and `hooks/` unit tests pass.

## Open Questions

1. Habit color picker: fixed palette (e.g. 6–8 swatches) vs free color picker? Defaulting to fixed palette for v1 simplicity — confirm or override.
2. Delete confirmation: native `Alert.alert` vs a custom NativeWind sheet? Defaulting to `Alert.alert` for v1 (no new dependency needed).
3. Should the existing "Tab Two" screen be repurposed as "Manage Habits," or should habit management live behind an "+" button on "Today" instead (single-tab app)? Defaulting to repurposing the second tab, per the Project Structure above.
