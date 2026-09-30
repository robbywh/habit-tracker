# Habit Tracker

A v1 mobile habit tracker built with Expo (Expo Router, React Native, NativeWind). Users create daily habits, check them off, edit or delete them, with everything persisted offline via AsyncStorage. See `SPEC.md` for the full spec and `AGENTS.md` for project conventions.

## Agent Team Workflow

This project's v1 implementation was built by three specialized Claude subagents defined in `.claude/agents/` — `backend-developer`, `mobile-developer`, and `qa` — coordinated so the UI and test workstreams don't have to wait on a fully finished data layer. `backend-developer` splits its work into two stages: Stage 1 publishes just the `Habit` type, the color palette, and the `use-habits` hook's exact function signatures (a stub, not real storage) as a stable contract; Stage 2 later swaps in real AsyncStorage persistence. Once Stage 1 is published, `mobile-developer` (for anything touching the `Habit` type or the hook) and `qa` both start immediately and run fully in parallel with each other and with `backend-developer`'s Stage 2 work — while a slice of `mobile-developer`'s work (tab layout/icons, generic `components/ui/*`) has no dependency at all and starts from the very beginning.

```mermaid
flowchart TD
    Spec(["SPEC.md: v1 Habit Tracker"]) --> S1
    Spec --> MD0

    S1["backend-developer — Stage 1 contract<br/>lib/habit-types.ts (Habit type)<br/>constants/habit-colors.ts (palette)<br/>hooks/use-habits.ts signature stub<br/>(create/update/remove/toggleToday)"]

    MD0["mobile-developer — Tier 0<br/>no dependency, starts immediately<br/>app/(tabs)/_layout.tsx tab labels/icons<br/>components/ui/* generic pieces (e.g. Checkbox)"]

    S1 -->|"contract published"| S2
    S1 -->|"contract published"| MD1
    S1 -->|"contract published"| QA

    S2["backend-developer — Stage 2<br/>lib/habit-storage.ts (AsyncStorage read/write,<br/>versioned key, migration)<br/>wire real storage into hooks/use-habits.ts"]

    MD1["mobile-developer — Tier 1/2<br/>components/habit/habit-list-item.tsx, habit-form.tsx<br/>app/habit/new.tsx, app/habit/[id]/edit.tsx<br/>app/(tabs)/index.tsx (Today), app/(tabs)/two.tsx (Manage Habits)<br/>mount data provider in app/_layout.tsx"]

    QA["qa — Vitest setup + tests<br/>vitest.config.ts, AsyncStorage mock<br/>__tests__/lib/*, __tests__/hooks/*<br/>target: 100% coverage of lib/ + hooks/"]

    MD0 -.feeds into.-> MD1

    S2 --> Verify
    MD1 --> Verify
    QA --> Verify

    Verify(["v1 verified: create / edit / delete / toggle habit<br/>state persists offline across app restart"])

    classDef backend fill:#dbeafe,stroke:#2563eb,color:#1e3a8a;
    classDef mobile fill:#dcfce7,stroke:#16a34a,color:#14532d;
    classDef qa fill:#fef3c7,stroke:#d97706,color:#78350f;
    classDef milestone fill:#f3f4f6,stroke:#6b7280,color:#111827;

    class S1,S2 backend;
    class MD0,MD1 mobile;
    class QA qa;
    class Spec,Verify milestone;
```

Each agent edits only the files it owns (see each `.claude/agents/*.md` for the exact file list), never touches `ios/`/`android/` (Continuous Native Generation), and asks before adding a dependency or changing the `Habit` shape. Before dispatching each agent, its task is classified with Jev (`typesafe/jev-1.13`) to pick the smallest capable model (tiny → Haiku 4.5, everyday → Sonnet 5, large → Opus 5.5, hardest → Fable 5.1), defaulting to Sonnet 5 when confidence is below 0.8 or the Jev call fails.
