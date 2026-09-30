# Implementation Plan: Habit Tracker v1 (remaining work)

## Overview

`SPEC.md`'s Stage 1 contract is already committed: `lib/habit-types.ts`, `lib/habit-id.ts`,
`lib/habit-date.ts`, `constants/habit-colors.ts`, `hooks/use-habits.ts` (in-memory stub behind
its final public API), `components/ui/checkbox.tsx`, renamed tab titles/icons, and the Vitest
tooling config. This plan covers everything still needed to hit v1's Success Criteria: real
AsyncStorage persistence, the Today and Manage Habits screens, create/edit/delete flows, and
tests for `lib/` and `hooks/`.

Tasks are vertically sliced (one user-facing capability at a time) per
`agent-skills:planning-and-task-breakdown`, ordered so each leaves the app in a working,
committable state. Per `AGENTS.md`/SPEC's Testing Strategy, route/screen files (`app/**`) get
**no** automated tests — they're verified manually via Argent (iOS simulator) — while `lib/` and
`hooks/` get full TDD with a 100% coverage target.

## Architecture Decisions

- **New dependency: `@react-native-async-storage/async-storage`.** SPEC's Boundaries list this
  as an "ask first" item. Flagging it here so the plan-approval checkpoint covers it — Task 1
  installs it via `npx expo install` (never `npm`/`bun add`), per `AGENTS.md`.
- **Hook test harness:** prefer a hand-rolled harness (a tiny host component + `react-test-renderer`
  if it resolves without adding a dependency) over pulling in `@testing-library/react-native`,
  per SPEC's Testing Strategy ("a minimal hand-rolled hook-test harness if it doesn't [work]").
  Only ask to add RTL if the hand-rolled approach hits a real blocker — don't silently reach for
  it as the default.
- **Storage format:** a single versioned JSON blob (one AsyncStorage key) holding the full habit
  list, matching SPEC's Project Structure (`lib/habit-storage.ts` — "versioned key, JSON
  (de)serialize"). Corrupt/unreadable data falls back to an empty list rather than throwing, so a
  bad blob doesn't brick the app on launch.
- **Stage 2 swap is internal-only:** `hooks/use-habits.ts`'s exported types/signatures
  (`UseHabitsResult`, `CreateHabitInput`, `UpdateHabitInput`) do not change — only the
  provider's internals swap from `useState` to storage-backed load/save. No consumer-facing
  task should need to change once written against Stage 1.

## Task List

### Phase 1: Real persistence (blocking — "survives restart" criterion)

#### Task 1: AsyncStorage-backed storage layer
**Description:** Add the AsyncStorage dependency and implement `lib/habit-storage.ts`
(load/save the full habit list as one versioned JSON blob), plus a Vitest-compatible AsyncStorage
mock so it's testable.
**Acceptance criteria:**
- [ ] `npx expo install @react-native-async-storage/async-storage` added to `package.json`/`bun.lock`
- [ ] `loadHabits(): Promise<Habit[]>` returns `[]` on first run (no stored key) and on corrupt/unparseable data
- [ ] `saveHabits(habits: Habit[]): Promise<void>` persists such that a subsequent `loadHabits()` round-trips the same data
**Verification:**
- [ ] `bun run test` passes (`__tests__/lib/habit-storage.test.ts`, written first/RED)
- [ ] `npx tsc --noEmit` passes
**Dependencies:** None
**Files likely touched:** `package.json`, `bun.lock`, `vitest.setup.ts`, `lib/habit-storage.ts`, `__tests__/lib/habit-storage.test.ts`
**Estimated scope:** Medium

#### Task 2: Wire `use-habits` to real storage (Stage 2)
**Description:** Swap `HabitsProvider`'s internals from in-memory `useState` to load from
`lib/habit-storage.ts` on mount (`isLoading` true → false) and persist after every mutation
(`create`/`update`/`remove`/`toggleToday`). Public API is unchanged.
**Acceptance criteria:**
- [ ] On mount, `isLoading` is `true` until the stored habits resolve, then `false`
- [ ] Every mutation persists via `saveHabits` so a fresh provider instance loads the updated state
- [ ] Existing Stage 1 call signatures (`create`, `update`, `remove`, `toggleToday`, `isDoneToday`) unchanged
**Verification:**
- [ ] `bun run test` passes (`__tests__/hooks/use-habits.test.ts`, extended/RED first for the persistence round-trip)
- [ ] `npx tsc --noEmit` passes
**Dependencies:** Task 1
**Files likely touched:** `hooks/use-habits.ts`, `__tests__/hooks/use-habits.test.ts`

### Checkpoint: Phase 1
- [ ] `bun run test` (100% coverage of `lib/` + `hooks/`), `npx expo lint`, `npx tsc --noEmit` all pass
- [ ] Commit history shows one commit per task, working tree clean

### Phase 2: Screens

#### Task 3: Today screen — list + toggle
**Description:** Mount `HabitsProvider` around the app (`app/_layout.tsx`) and rewrite
`app/(tabs)/index.tsx` as the "Today" screen: list all habits via `useHabits()`, each row using a
new `components/habit/habit-list-item.tsx` (name + the existing `Checkbox`), tapping toggles
today's completion.
**Acceptance criteria:**
- [ ] `HabitsProvider` wraps the app once, above both tabs
- [ ] Today screen renders one row per habit with its checkbox state reflecting `isDoneToday`
- [ ] Tapping a row calls `toggleToday` and the checkbox updates
- [ ] Empty state (no habits yet) renders something reasonable, not a blank screen
**Verification:**
- [x] No automated test (route file, per SPEC Testing Strategy) — verify manually via Argent: boot iOS simulator, launch app, confirm Today tab renders and toggle works
- [x] `npx expo lint` and `npx tsc --noEmit` pass
**Dependencies:** Task 2
**Files likely touched:** `app/_layout.tsx`, `app/(tabs)/index.tsx`, `components/habit/habit-list-item.tsx`
**Status:** Done — committed `a35bee0`.
**Estimated scope:** Medium

#### Task 4: Manage Habits screen + create flow
**Description:** Rewrite `app/(tabs)/two.tsx` as "Manage Habits" (list of habits + a "+" entry
point), build the shared `components/habit/habit-form.tsx` (name input + color swatch picker from
`HABIT_COLORS`, supporting both create and edit modes), and `app/habit/new.tsx` as a modal route
registered in `app/_layout.tsx`.
**Acceptance criteria:**
- [ ] Manage Habits screen lists all habits (name + color swatch)
- [ ] A "+" affordance navigates to `app/habit/new.tsx` (modal presentation)
- [ ] Submitting the form with a name + color calls `create` and the modal dismisses back to Manage Habits
- [ ] The new habit appears on both Manage Habits and Today immediately (shared `HabitsProvider` state)
**Verification:**
- [ ] No automated test (route/component files rendering UI, verified manually) — Argent walkthrough on **both iOS simulator and Android emulator**: create a habit, confirm it shows on both tabs
- [ ] `npx expo lint` and `npx tsc --noEmit` pass
**Dependencies:** Task 3
**Files likely touched:** `components/habit/habit-form.tsx`, `app/habit/new.tsx`, `app/(tabs)/two.tsx`, `app/_layout.tsx`
**Estimated scope:** Medium

#### Task 5: Edit and delete habit
**Description:** Add `app/habit/[id]/edit.tsx` (modal route, reuses `habit-form.tsx` pre-filled
with the existing habit), wired from a tap on a Manage Habits row. Add a delete affordance per row
using `Alert.alert` for confirmation (SPEC Open Question 2 default), removing the habit from both
screens.
**Acceptance criteria:**
- [ ] Tapping a habit row on Manage Habits opens edit pre-filled with its current name/color
- [ ] Submitting the edit form calls `update` and changes are reflected on both tabs
- [ ] A delete action prompts `Alert.alert` for confirmation before calling `remove`
- [ ] After deletion, the habit is gone from both Manage Habits and Today
**Verification:**
- [ ] No automated test (route/component UI) — Argent walkthrough on **both iOS simulator and Android emulator**: edit a habit's name/color, then delete a habit with confirmation, confirm both screens update
- [ ] `npx expo lint` and `npx tsc --noEmit` pass
**Dependencies:** Task 4
**Files likely touched:** `app/habit/[id]/edit.tsx`, `app/_layout.tsx`, `app/(tabs)/two.tsx`
**Estimated scope:** Small/Medium

### Checkpoint: Complete
- [ ] All SPEC.md Success Criteria checked off
- [ ] `bun run test`, `npx expo lint`, `npx tsc --noEmit` all pass
- [ ] Full manual Argent walkthrough on **both iOS simulator and Android emulator**: create → toggle → edit → delete → kill & relaunch app → state persisted
- [ ] One commit per task, clean working tree, ready for review

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Hand-rolled Vitest AsyncStorage mock diverges from real native behavior | Medium | Keep the mock minimal (get/set/remove on an in-memory `Map`) and rely on Argent manual verification (Task 3 checkpoint) against the real simulator for the actual persistence behavior, not just the mock |
| No RTL — hand-rolled hook test harness may be awkward for async state | Medium | Task 2 tries a minimal `react-test-renderer`-based harness first; if it's a real blocker, stop and ask before adding `@testing-library/react-native` (an "ask first" dependency per SPEC Boundaries) |
| Route files are unverifiable by automated tests | Low | Explicit Argent manual-verification step per screen task, matching SPEC's Testing Strategy and `AGENTS.md`'s "test the feature in a browser/simulator before declaring done" rule |

## Open Questions

None outstanding — SPEC.md's three Open Questions already have defaults recorded (fixed color
palette, `Alert.alert` for delete confirmation, repurposing the second tab), and this plan follows
those defaults.
