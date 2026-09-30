# FSD: Habit Management (Manage Habits screen + create/edit/delete)

Status: Draft for implementation
Owner: Tech Lead
Covers: `tasks/plan.md` Task 4 (Manage Habits screen + create flow) and Task 5 (edit + delete habit)
Depends on (already implemented, do not change): `hooks/use-habits.ts` (`HabitsProvider`/`useHabits`), `lib/habit-storage.ts`, `lib/habit-types.ts`, `constants/habit-colors.ts`, `components/ui/checkbox.tsx`, `components/habit/habit-list-item.tsx`, `app/(tabs)/index.tsx` (Today screen)

## 1. Overview

This feature turns the repurposed second tab into a working "Manage Habits" screen and adds the create, edit, and delete flows that let a user fully manage their habit list from the UI. It satisfies the SPEC.md v1 success criteria that are still unchecked: creating a habit (name + color) from Manage Habits, the new habit appearing immediately on Today, editing a habit's name/color, deleting a habit with confirmation and having it disappear from both screens, and all state surviving a full app kill + relaunch. It covers exactly `tasks/plan.md` Task 4 (Manage Habits screen, `habit-form.tsx`, `app/habit/new.tsx`) and Task 5 (`app/habit/[id]/edit.tsx`, delete with `Alert.alert` confirmation). No new state management, storage format, or dependency is introduced — this is a UI layer over the already-shipped `useHabits()` API.

## 2. User Flows

### 2.1 Create a habit
1. User is on the "Manage Habits" tab.
2. User taps the "+" affordance (header button, matching the existing `two.tsx`/tab header pattern).
3. The app presents the "New Habit" screen as a modal (slides up from the bottom).
4. User types a habit name into the name field.
5. User taps one color swatch from the fixed palette (one swatch is pre-selected by default so the form is valid without an extra step).
6. User taps "Save" (or "Create").
   - If the name is invalid (empty/whitespace-only, or over the max length), "Save" is disabled and no submission occurs (see §5).
7. On a valid submit, the app calls `create({ name, color })`, the modal dismisses, and the user lands back on "Manage Habits".
8. The new habit appears immediately in the Manage Habits list and, when the user switches tabs, in the Today list too (same `HabitsProvider` state, no refetch needed).
9. User can cancel at any point (header "Cancel"/"X" or swipe-to-dismiss on iOS) which discards the draft and returns to Manage Habits with no habit created.

### 2.2 Edit a habit
1. User is on "Manage Habits" and taps an existing habit row (not its delete affordance).
2. The app presents the "Edit Habit" screen as a modal, pre-filled with that habit's current name and color.
3. User changes the name and/or taps a different color swatch.
4. User taps "Save".
   - Same validation as create; "Save" stays disabled while the name is invalid.
5. On valid submit, the app calls `update(id, { name, color })`, the modal dismisses, and the user returns to "Manage Habits".
6. The updated name/color is reflected immediately in both the Manage Habits row and the Today row for that habit.
7. User can cancel to discard changes and return without calling `update`.

### 2.3 Delete a habit (with confirmation)
1. User is on "Manage Habits" and triggers the delete affordance on a habit row (e.g. swipe-to-delete or a trailing delete icon — see §3.2 for the chosen affordance).
2. The app shows a native confirmation dialog (`Alert.alert`) before deleting anything (see §6 for exact copy).
3. If the user taps "Cancel" (or dismisses the dialog), nothing changes — the habit remains in the list, `remove` is never called.
4. If the user taps "Delete", the app calls `remove(id)`.
5. The habit disappears immediately from the Manage Habits list and from the Today list.
6. If that was the last remaining habit, Today shows its existing empty state ("No habits yet…") and Manage Habits shows its own empty state (§3.1).

## 3. Screens & Components

### 3.1 `app/(tabs)/two.tsx` — "Manage Habits" screen

**Purpose:** Lists all habits with their color and name, is the entry point to create a new habit, and is the entry point to edit or delete an existing one. Replaces the current scaffolded "Tab Two" content entirely (no `themed.tsx`/`EditScreenInfo` usage retained — this screen is being rewritten, so NativeWind applies per SPEC's Code Style rule).

**Props:** none — it's a route component (`export default function ManageHabitsScreen()`), reads all data via `useHabits()`.

**Consumes:** `useHabits()` → `habits`, `isLoading`, `remove`. (`create`/`update` are called from the modal routes, not this screen.)

**States:**
- **Loading** (`isLoading === true`): centered "Loading…" text, matching the Today screen's loading state exactly (same copy/style) for consistency.
- **Empty** (`isLoading === false && habits.length === 0`): centered message, e.g. "No habits yet" / "Tap + to add your first habit." (mirrors Today's empty-state pattern/tone, but Manage Habits' copy points at its own "+" rather than "another tab").
- **Populated:** a `FlatList` of habit rows (see `HabitManageListItem` below), one per habit, in the same creation order `habits` is already returned in (no client-side sorting introduced).
- **Header:** a "+" button (reuse the `SymbolView` + `Link`/`Pressable` header-right pattern already used on the Today tab in `app/(tabs)/_layout.tsx`, or add an equivalent `headerRight` on the `two` route's `Tabs.Screen` options) that navigates to `/habit/new`.

**New component: `components/habit/habit-manage-list-item.tsx`**
This screen needs a row that shows the color/name (like `HabitListItem`) but exposes edit (tap row) and delete (secondary affordance) instead of a checkbox — `HabitListItem` is Today-specific (checkbox + toggle) and should not be overloaded with edit/delete concerns. A new, small sibling component keeps each list item single-purpose, matching the existing `habit-list-item.tsx` file/prop shape convention.

```ts
type Props = {
  habit: Habit;              // from '@/lib/habit-types'
  onPress: (id: string) => void;   // navigates to edit
  onDelete: (id: string) => void;  // triggers the Alert.alert confirmation flow
};
```

- Renders the color dot + name (same visual language as `HabitListItem`: `h-3 w-3 rounded-full` dot with `backgroundColor: habit.color`, `text-base text-gray-900 dark:text-gray-100` name).
- `onPress` fires on tapping the row body → `router.push('/habit/[id]/edit', { id: habit.id })` from the parent screen (the component itself only calls the `onPress`/`onDelete` callbacks passed in; it does not import `expo-router` directly, matching `HabitListItem`'s pattern of staying navigation-agnostic).
- A trailing delete icon (`SymbolView` with `ios: 'trash'`, `android: 'delete'`, `web: 'delete'`, sized to match the existing checkbox's ~28pt tap target) calls `onDelete(habit.id)`, which the screen wires to the `Alert.alert` flow in §6 — the component itself does not know about the confirmation dialog, keeping it presentation-only and testable in isolation if that's ever revisited.

**States for `HabitManageListItem`:** none beyond the props — it's a pure/stateless row.

### 3.2 `components/habit/habit-form.tsx`

**Purpose:** Shared form UI for both creating and editing a habit — name input + color swatch picker — used by both `app/habit/new.tsx` and `app/habit/[id]/edit.tsx`. This is the single place the validation rules in §5 live.

**Props:**

```ts
type HabitFormValues = {
  name: string;
  color: string; // one of HABIT_COLORS from '@/constants/habit-colors'
};

type Props = {
  /** Pre-fills the form; omitted (undefined) for create, provided for edit. */
  initialValues?: HabitFormValues;
  /** Called only when the form is valid and the user tapped Save. */
  onSubmit: (values: HabitFormValues) => void;
  /** Called when the user cancels/dismisses without saving. */
  onCancel: () => void;
  /** "Create Habit" vs "Save Changes" — lets the two screens reuse one component with different copy. */
  submitLabel: string;
};
```

**States:**
- **Untouched/default:** name empty (create) or pre-filled (edit); color defaults to `DEFAULT_HABIT_COLOR` (create) or the habit's current color (edit).
- **Valid:** name passes validation (§5) and a color is selected → Save button enabled.
- **Invalid:** name fails validation → Save button disabled (see §5 for the chosen invalid-submit UX and its justification).
- The form holds its own local `useState` for the in-progress `name`/`color` — this is ephemeral UI state, not app state, and does not go through `useHabits()` until submit. This is the only local state this feature introduces; it does not violate "no new state management" since it never persists or leaves the component tree.

### 3.3 `app/habit/new.tsx` — Create Habit screen (modal route)

**Purpose:** Hosts `HabitFormComponent` in create mode.

**Props:** none — route component, no params.

**Behavior:**
- Renders `<HabitForm submitLabel="Create Habit" onSubmit={...} onCancel={() => router.back()} />` with no `initialValues`.
- `onSubmit={(values) => { create(values); router.back(); }}` — calls `create` from `useHabits()`, then navigates back to Manage Habits. `create` is fire-and-forget from the screen's perspective (it's already optimistic/synchronous-feeling because `HabitsProvider` updates `habits` state immediately and persists in the background); the screen does not need to await it before calling `router.back()`.
- Header title: "New Habit"; a "Cancel" header-left (or relies on the modal's native swipe-to-dismiss / close affordance) that calls `router.back()` without creating anything.

**States:** delegates all form state to `HabitForm`; the screen itself has none.

### 3.4 `app/habit/[id]/edit.tsx` — Edit Habit screen (modal route)

**Purpose:** Hosts `HabitForm` in edit mode for the habit identified by the route's `id` param.

**Props:** none — route component; reads `id` via `useLocalSearchParams<{ id: string }>()`.

**Behavior:**
- Looks up the habit: `const { habits, update } = useHabits(); const habit = habits.find(h => h.id === id);`
- **Edge case — habit not found** (e.g. deep link to a stale/deleted id): render a small "Habit not found" state with a button/back action to `router.back()`, rather than crashing on `habit.name`. This can happen if the user double-taps a row and a delete fires first, or navigates back into a stale modal — see §7.
- When found, renders `<HabitForm submitLabel="Save Changes" initialValues={{ name: habit.name, color: habit.color }} onSubmit={...} onCancel={() => router.back()} />`.
- `onSubmit={(values) => { update(habit.id, values); router.back(); }}`.
- Header title: "Edit Habit"; same cancel affordance as the create screen.

**States:** loading is not applicable here (habits are already loaded by the time Manage Habits is interactive); the only extra state versus the create screen is the "not found" fallback above.

## 4. Navigation / Routing

- Both new routes live under `app/habit/`, per SPEC.md's Project Structure: `app/habit/new.tsx` and `app/habit/[id]/edit.tsx`. Route files stay thin (render `HabitForm` + wire callbacks); all logic is in `habit-form.tsx` and `use-habits.ts`, per `AGENTS.md`'s "keep route files in `app/` thin" rule.
- Both are registered as modal routes in `app/_layout.tsx`'s root `<Stack>`, the same way `modal.tsx` already is:

  ```tsx
  <Stack>
    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
    <Stack.Screen name="habit/new" options={{ presentation: 'modal', title: 'New Habit' }} />
    <Stack.Screen name="habit/[id]/edit" options={{ presentation: 'modal', title: 'Edit Habit' }} />
  </Stack>
  ```

  (Expo Router auto-registers file-based routes; explicit `<Stack.Screen>` entries here only set `presentation`/`title` options, matching how `modal` is already declared — no new routing mechanism is introduced.)
- Both routes are nested inside `HabitsProvider` already, since `HabitsProvider` wraps the entire `<Stack>` in `app/_layout.tsx` (see the code read from that file) — no additional provider wiring is needed.
- **Entering:** Manage Habits' "+" header button does `router.push('/habit/new')`; a habit row's `onPress` does `router.push({ pathname: '/habit/[id]/edit', params: { id: habit.id } })`.
- **Leaving:** every exit — Save (after a successful `create`/`update` call) or Cancel — calls `router.back()`. There is no "Save and stay" state; a successful submit always returns to Manage Habits.

## 5. Form Validation Rules

- **Name:**
  - Required: the trimmed name must be non-empty. Trimming happens before both the validity check and the value passed to `create`/`update` (so `"  Read  "` is stored as `"Read"`, not with leading/trailing whitespace).
  - Max length: **50 characters** (trimmed length). *Tech-lead default* — SPEC.md does not specify a max; 50 is chosen as a generous but layout-safe limit for a single-line list row on a phone width. Flag if product wants a different number.
  - No other character restrictions (emoji, punctuation, etc. are all allowed) — SPEC does not call for any, and adding some would be scope creep.
- **Color:**
  - Must be one of the fixed `HABIT_COLORS` values from `constants/habit-colors.ts` — use the existing `isHabitColor()` guard from that file rather than re-implementing the check. Since the form only ever lets the user tap a rendered swatch (never free text/hex entry), this is effectively guaranteed by construction, but `isHabitColor()` is still the single source of truth if that ever changes.
  - The form always has a color selected (defaults to `DEFAULT_HABIT_COLOR` on create, to the habit's existing color on edit) — there is no "no color chosen" state to validate against.
- **Invalid-submit UX — chosen behavior: disable the Save button**, not an inline error message. *Tech-lead decision:* the only failure mode is an empty/too-long name, which the user can see and self-correct without needing an error string (an inline "Name is required" adds a component and a state transition for a single obvious case). This also matches the form's small size — there's no ambiguity about which field is wrong. If a live character counter is wanted for the 50-char limit, that's a nice-to-have, not required for acceptance.

## 6. Delete Confirmation Flow

Delete uses a native `Alert.alert` from `react-native`, called from `app/(tabs)/two.tsx` (not from `HabitManageListItem`, which only reports the intent via `onDelete`). *Tech-lead default copy* (SPEC.md Decision 2 only settles the mechanism, not the exact strings):

```ts
Alert.alert(
  'Delete habit?',
  `"${habit.name}" and its history will be permanently deleted.`,
  [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Delete',
      style: 'destructive',
      onPress: () => remove(habit.id),
    },
  ]
);
```

- **Title:** "Delete habit?"
- **Message:** interpolates the habit's current name so the user confirms the right one; mentions "history" because deleting removes the habit's `completions` map too (there is no soft-delete or per-date history retention in v1).
- **Cancel button:** label "Cancel", `style: 'cancel'` (iOS renders it bold/default-safe; Android renders it as a plain dismiss action) — tapping it or dismissing the dialog (back button/tap-outside on Android) calls no callback, so `remove` never fires and app state is untouched.
- **Destructive button:** label "Delete", `style: 'destructive'` (renders red on iOS; Android has no destructive tint but the label alone is enough) — its `onPress` is the only path that calls `remove(id)`.
- **Post-confirm state:** `remove` updates `habits` in `HabitsProvider`, which re-renders both Manage Habits (row disappears) and Today (row disappears) since they share the one provider instance; `lib/habit-storage.ts` persists the new list in the background via the existing `useEffect` in `use-habits.ts` — no extra persistence call is needed from this screen.
- **Post-cancel state:** no state change of any kind.

## 7. State & Data Flow

- All three new/changed screens and the two new components consume the existing `useHabits()` hook exported from `hooks/use-habits.ts` and read from the single `HabitsProvider` already mounted in `app/_layout.tsx`. No new Context, no new global state, no new storage key, and no direct `lib/habit-storage.ts` calls from `app/**` — screens only ever go through `useHabits()`, per SPEC's Project Structure and Boundaries ("keep route files in `app/` thin; logic lives in `lib/`/`hooks/`").
- Exact calls used by this feature, all pulled from the real `UseHabitsResult` contract (`hooks/use-habits.ts`):
  - `create(input: CreateHabitInput): Promise<Habit>` — called from `app/habit/new.tsx` on submit.
  - `update(id: string, input: UpdateHabitInput): Promise<void>` — called from `app/habit/[id]/edit.tsx` on submit.
  - `remove(id: string): Promise<void>` — called from `app/(tabs)/two.tsx` after the user confirms the `Alert.alert`.
  - `habits: Habit[]` and `isLoading: boolean` — read by `app/(tabs)/two.tsx` to render the list/loading/empty states, and by `app/habit/[id]/edit.tsx` to look up the habit being edited.
- Because `create`/`update`/`remove` all mutate the same `habits` array inside `HabitsProvider` (via `setHabits`), and both tabs plus both modals sit under the one provider instance, there is no manual "refresh" or event-bus step needed for changes to show up on the other tab — this is existing behavior, not something this feature needs to build.
- Persistence (`saveHabits`) already runs automatically after every `habits` change via the `useEffect` in `use-habits.ts`; this feature's screens never call `lib/habit-storage.ts` directly.

## 8. Edge Cases

- **Deleting the last habit:** Today falls back to its existing empty state ("No habits yet / Add one from the Manage Habits tab…"); Manage Habits shows its own empty state (§3.1). No special-casing needed — both are just `habits.length === 0` renders that already exist or are specified here.
- **Rapid double-submit on the create/edit form:** the Save button should visually disable/no-op after the first tap until `router.back()` completes (e.g. guard with a local `isSubmitting` flag in `HabitForm`, or simply disable the button once `onSubmit` has fired once) so a fast double-tap can't call `create`/`update` twice before the modal dismisses. Since `create` always appends a new habit with a fresh id, an unguarded double-tap would create two identical habits — this guard is required, not optional.
- **Editing/deleting while offline:** not applicable — v1 is fully local (AsyncStorage only, no network calls anywhere in this feature), so there is no offline/online distinction to handle. State this explicitly to implementers so no one adds a network-status check.
- **Very long habit names:** capped at 50 trimmed characters by validation (§5); the list row (`HabitManageListItem`/`HabitListItem`) should let `Text` truncate with `numberOfLines={1}` rather than wrap and break row height, since neither existing list-item component currently sets a truncation behavior and a 50-char name can still overflow a narrow phone width.
- **Color palette reuse:** not an edge case requiring handling — `HABIT_COLORS` has 8 fixed swatches and multiple habits are allowed to share the same color (SPEC's data model has no uniqueness constraint on `color`). No "palette exhausted" state exists or needs to be built.
- **Editing a habit that was deleted from elsewhere while its edit modal is open:** not reachable in v1 (single-user, single-provider-instance, no multi-window/multi-device sync), but `app/habit/[id]/edit.tsx`'s "not found" fallback (§3.4) covers the closest realistic case — a stale `id` param from a race between a delete tap and a pending navigation.

## 9. Out of Scope

Restated from SPEC.md's Objective — none of the following are introduced, touched, or scaffolded by this feature:
- Streaks / history / heatmaps (deleting a habit does remove its `completions` map, but no streak calculation or display is added anywhere).
- Reminders & notifications.
- Stats / insights dashboard.
- Cloud sync or accounts (all state stays in local AsyncStorage via the existing `lib/habit-storage.ts`).
- A free/custom color picker — the picker is the fixed `HABIT_COLORS` palette only (SPEC Decision 1).
- Per-weekday/custom frequency scheduling — habits remain daily-only.
- Any new dependency — this feature is built entirely from `react-native` core (`Alert`, `FlatList`, `Pressable`, `TextInput`), `expo-router`, `expo-symbols` (already used by the tab bar), and the existing `useHabits()`/NativeWind stack.

## 10. Acceptance Criteria

Restated in this FSD's own terms from `tasks/plan.md` Task 4 and Task 5, self-sufficient for an implementer without cross-referencing the plan:

**Task 4 — Manage Habits screen + create flow**
- [ ] `app/(tabs)/two.tsx` renders a loading state, an empty state, and a list of all habits (color swatch + name) sourced from `useHabits().habits`, matching the states specified in §3.1.
- [ ] A "+" affordance on the Manage Habits screen navigates to `app/habit/new.tsx`, presented as a modal per §4.
- [ ] `app/habit/new.tsx` renders `HabitForm` with no pre-filled values, a default-selected color, and a "Create Habit" submit label.
- [ ] Submitting the form with a valid (non-empty, ≤50-char trimmed) name and a palette color calls `create({ name, color })` and the modal dismisses back to Manage Habits (`router.back()`).
- [ ] An invalid name (empty or over 50 trimmed characters) keeps the Save button disabled; no call to `create` can be triggered.
- [ ] The new habit appears immediately on both Manage Habits and Today without any manual refresh, because both read the same `HabitsProvider` state.

**Task 5 — Edit and delete habit**
- [ ] Tapping a habit row's body (not its delete affordance) on Manage Habits navigates to `app/habit/[id]/edit.tsx`, presented as a modal, pre-filled with that habit's current name and color.
- [ ] Submitting the edit form with valid values calls `update(id, { name, color })` and the modal dismisses back to Manage Habits; the updated name/color shows immediately on both Manage Habits and Today.
- [ ] A delete affordance on each Manage Habits row triggers the exact `Alert.alert` flow in §6 before any deletion occurs.
- [ ] Confirming the alert calls `remove(id)`; the habit disappears immediately from both Manage Habits and Today. Cancelling the alert calls nothing and leaves the list unchanged.
- [ ] Deleting the last habit leaves both screens in their respective empty states (§8), not a crash or blank screen.

## 11. QA Notes for Argent

Manual walkthrough only — per SPEC's Testing Strategy, route/component files under `app/**` and `components/habit/**` get no automated tests and are verified via Argent on **both iOS simulator and Android emulator**. Run the full sequence below on each platform:

1. Boot the target (iOS simulator or Android emulator), launch the app fresh (first run or after a full reinstall so there's no leftover habit data, or manually delete all existing habits first via the app).
2. On the "Manage Habits" tab, confirm the empty state renders (no habits yet).
3. Tap "+", confirm the "New Habit" modal opens. Try tapping Save with an empty name — confirm Save is disabled. Type a name (e.g. "Drink water"), tap a color swatch, tap Save.
4. Confirm the modal dismisses back to Manage Habits and the new habit appears in the list with the chosen color.
5. Switch to the "Today" tab — confirm the same habit appears there too, unchecked.
6. Toggle it done on Today, switch back to Manage Habits — confirm the habit is still listed (Manage Habits does not show completion state, only Today does).
7. Back on Manage Habits, tap the habit row (not the delete icon) — confirm the "Edit Habit" modal opens pre-filled with the current name/color. Change the name and pick a different color, tap Save.
8. Confirm the modal dismisses and the updated name/color show on both Manage Habits and Today.
9. Trigger the delete affordance on the habit row — confirm the native `Alert.alert` appears with the copy from §6. Tap "Cancel" — confirm the habit is still present on both tabs.
10. Trigger delete again and tap "Delete" — confirm the habit disappears immediately from both Manage Habits and Today, and Today shows its empty state if it was the only habit.
11. Create at least one more habit, then fully kill the app (swipe away / force-stop) and relaunch it. Confirm the surviving habit(s) and their completion state from step 6 are still present exactly as left — this validates the AsyncStorage persistence contract end-to-end through the UI, not just the unit tests.
12. Repeat steps 3–11 (abbreviated if step 11 already passed once) on the other platform (iOS if you started on Android, or vice versa) to satisfy the plan's "both iOS simulator and Android emulator" verification requirement.

Capture screenshots at steps 4, 8, and 10 (list states before/after) if a visual record is useful for the PR; no screen recording or screenshot-diff baseline is required unless a visual regression is suspected.
