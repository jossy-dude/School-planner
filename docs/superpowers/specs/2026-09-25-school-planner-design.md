# School Planner — Design Spec

Date: 2026-09-25
Status: approved design (sections 1–6), pending spec review

## 1. Overview

A local-only mobile school planner for one user: class schedule with reminders,
grades with a fully configurable GPA calculator, a study timer with session logs
and study promises, a per-course file vault, school events, a manual attendance
calendar, and a countdown to the active session.

Visual identity: **paper-monochrome brutalism with near-zero text** — components,
icons, glyphs and big numbers carry the interface; text only where unavoidable.

### Hard constraints

- **Expo Go on Android** (`expo@57.0.9+`). Everything must run in Expo Go: no
  custom native modules, no Android SDK, no EAS builds.
- **Local-only storage.** No accounts, no network. Backup = local ZIP export
  + import; auto-backup runs **on app open** when the interval has elapsed
  (`expo-background-task` does not run in Expo Go).
- **Notifications:** local notifications only (`expo-notifications`). Push is
  unavailable in Expo Go (SDK 53+).
- **No `mixBlendMode`** — broken on Android RN. Textures are pre-baked or drawn
  with Skia RuntimeEffect shaders instead of runtime blending.
- **Shared-element transitions** are experimental on RN → route/overlay morphs
  are built with the measure-morph pattern (Reanimated 4), not native shared
  elements.
- The mockups in `PROOF · study nest.html` / `PROOF · study appliance.html` are
  **data-model references only** — do not recreate their screens.

## 2. Architecture (approved)

- **Framework:** Expo SDK 57, TypeScript (strict), Expo Router (file-based).
- **Storage:** SQLite via Drizzle ORM (`expo-sqlite`), migrations shipped with
  the app. All data in the app sandbox.
- **State:** Zustand stores per feature; DB is the source of truth, stores cache
  queries and expose mutations.
- **Notifications:** `expo-notifications` — scheduled at write time, rescheduled
  on app open (catch-up for missed schedules).
- **Files:** `expo-document-picker` + `expo-file-system` — picked files are
  **copied** into the app sandbox (`DocumentStorage` dir); vault never points at
  original URIs.
- **Backup:** `fflate` (`zipSync`) for archive building; `expo-sqlite`
  `backupAsync` for the DB snapshot; `expo-sharing` for export sheet;
  `react-native-csv` for grade export.
- **Fonts:** `@expo-google-fonts/*` packages (doto, vt323, dotgothic16-latin subset,
  share-tech-mono, orbitron, bricolage-grotesque) + DSEG TTFs from the DSEG
  release (23–29 KB). All static weights; no variable-font handling needed.
  Target ≈ 600 KB total (DotGothic16 subsetted latin 2 MB → 45 KB via
  google-webfonts-helper).

### Project layout

```
app/
  (tabs)/
    today.tsx        # hero countdown, promises, due-soon
    calendar.tsx     # month grid, filters, day detail, attendance
    courses.tsx      # course list
    timer.tsx        # dot-on-arc timer, logs, promises
    vault.tsx        # folders per course
    gpa.tsx          # compact gauge screen
  course/[id].tsx    # course page (banner, grades, notes, files, attendance)
  event/[id].tsx     # event detail/edit
  schedule-edit.tsx  # pattern/one-off editor (modal)
  settings.tsx       # GPA scale editor, reminders, backup, appearance
  _layout.tsx        # root stack + providers
src/
  db/                # drizzle schema, migrations, query modules
  features/<name>/   # components, hooks, store, queries per feature
  lib/gpa/           # pure GPA engine (no RN imports)
  lib/schedule/      # pure recurrence/occurrence engine
  lib/reminders/     # notification scheduling policy
  ui/                # design system (tokens, textures, primitives)
assets/fonts/, assets/textures/
```

`src/lib/**` are pure TypeScript (unit-testable under Jest, no React Native
imports). All RN/DOM-dependent code lives in `src/features` and `src/ui`.

## 3. Data model (approved)

All tables have TEXT uuid primary keys and `created_at`/`updated_at` (ISO).

| Table | Key fields |
|---|---|
| `terms` | name, start_date, end_date |
| `courses` | term_id?, code, name, emoji, color, pattern(dots/stripes/grid), banner_uri?, credits, default_duration_min, reminder_lead_override_min? |
| `schedule_patterns` | course_id, weekday(0–6), start_time, end_time, location, valid_from, valid_to |
| `schedule_exceptions` | course_id, pattern_id?, date, kind(one_off\|cancelled), start_time?, end_time? |
| `attendance` | course_id, date, status(present\|absent\|late\|excused), note? — unique(course_id, date) |
| `events` | kind(assignment\|test\|quiz\|club\|meeting\|other), title, description, course_id?, due_at, remind_lead_override_min?, done |
| `grade_categories` | course_id, name, weight |
| `grades` | course_id, category_id?, title, score, max_score, date, weight_override?, note? |
| `gpa_scales` | name, rows(json: [{letter, min_pct, points}]), is_default |
| `study_sessions` | course_id, started_at, duration_min, note? |
| `study_promises` | course_id?, subject, target_min, period(day\|week) |
| `files` | course_id?, category(materials\|assignments\|submissions\|other), name, sandbox_uri, size, mime, description?, added_at |
| `notes` | course_id?, kind(teacher_said\|exam_tip), body, description? |
| `settings` | key/value JSON: reminder_lead_default_min, study_goal_min, gpa_scale_id, gpa_rounding(0–3), backup_interval_days, backup_last_at, week_start, tab prefs |

Relationship rules: deleting a course cascades to its patterns, grades,
attendance, sessions, files (unless `course_id IS NULL`), notes; events keep
their row but drop the link (user confirms first). Grades of excluded courses
simply do not enter GPA math (no flag needed — inclusion is computed by the
engine from settings + explicit excludes list in `settings.gpa_excluded`).

## 4. Screens & navigation (approved)

Six tabs + header gear → settings stack.

| Tab | Contents |
|---|---|
| **Today** | Hero: big countdown (Doto) to next/active class on the dot-on-arc clock. **Active class = animata tick bar** (or liquid-bars moment on start). **Promise progress bars** (animata ticks). Due-soon tickets: **T-minus chips + one-line description** (DSEG7 chips). Weekly attendance gauges. |
| **Calendar** | Month grid (flash-calendar base restyled), rounded selection morph, class dots + absence marks per day, **filter chips with counts** (All · Classes · Exams · Tasks · Clubs — toggleable). Tap day → **fluid expanding day detail** listing sessions/events/tasks; mark attendance per session there. Header `+` → schedule/event editor. |
| **Courses** | Course list as folder-style cards (emoji + color + texture). Tap → course page: banner, code/credits/default duration, schedule, notes (teacher-said w/ descriptions), files, grades, attendance stats — all in one scroll. |
| **Timer** | Dot-on-arc countdown, subject picker, session history, promises + tick-bar progress, mascot moment (blink) on completion. |
| **Vault** | Folder cards per course → category sheets (Materials / Assignments / Submissions / Other). File picker import (copy to sandbox), open, rename, delete, descriptions. |
| **GPA** | Sticky result card on top: Term/Cumulative segmented tabs, **arc gauge with big number**, stat cards (scale name, credits, points). Scrolling compact form below: scale chips, rounding stepper, per-course include/exclude rows, target chips (A / B / C / Pass), needed-on-final solver with feasibility bands (safe / borderline / impossible). |
| **Settings** | GPA scale editor (letter ↔ % ↔ points rows, gap/overlap validation, live preview), reminders (default lead + per-course override), study goal, backup (export ZIP / import / auto-backup interval), week start, appearance. |

Navigation: Expo Router tabs; course/event/settings are stack pushes; editors
open as modals. Back gesture works everywhere.

## 5. Design system (approved)

### Palette (paper monochrome)

- paper `#F4F1EA`, paper-2 `#EBE6DA`, ink `#141414`, ink-70/40/15 greys,
  pure black for emphasis, red `#C8352A` reserved for **absence marks and
  destructive actions only**.
- **Course accent color + pattern (dots/stripes/grid) + emoji = the only color
  in the app** — subjects are identifiable at a glance.

### Texture

- Static grain overlay PNG (2–3 % opacity) over paper surfaces.
- Course banners/textures: pre-baked subtlepatterns-style tiles
  (CC BY-SA) tinted with the course color; optionally generated once via Skia
  `FractalNoise` and cached as files. No runtime blending.

### Typography

| Role | Font |
|---|---|
| UI body/labels | Bricolage Grotesque |
| Clock / countdown numerals | **Doto** (weights 600 & 1000; verify no jitter) |
| LCD chips (T-minus, scores) | DSEG7 |
| Micro labels / stamps (VOID, DONE) | DotGothic16 (latin subset) |
| Rare headings / mono accents | Orbitron, Share Tech Mono |
| Decorative clock-face digits | VT323 (secondary clock font) |

### Primitives (all custom-built in `src/ui`)

BrutCard (hard offset shadow + press-depth translate), filter chips with
counts, sliding-indicator segmented chips, tick slider with numbered stops,
SVG arc gauge, animata tick bar (2 px ticks, 6 ms/index stagger, fast-fill /
slow-release — Reanimated 4 CSS transitions), liquid bars (ported to Skia
RuntimeEffect + Reanimated uniforms; used sparingly for the active class),
folder cards, T-minus ticket cards, stamps, dot-indicator bottom nav,
measure-morph day detail, 2-frame mascot blink, square hard-shadow icon
buttons, bottom-connected cards.

### Motion

Spring-based everything (Reanimated 4 defaults), press = translate + shadow
collapse, grain breathing, haptics on timer ticks and stepper changes.

## 6. Feature behavior

- **Schedule:** weekly patterns + term windows + one-off/cancelled exceptions;
  occurrences generated by `src/lib/schedule` (pure); Today/Calendar render
  from it. Class duration default = `courses.default_duration_min`, overridable
  per pattern.
- **Reminders:** global default lead (`settings.reminder_lead_default_min`)
  overridden by `courses.reminder_lead_override_min`, then by
  `events.remind_lead_override_min` (most specific wins). Infrastructure
  (scheduler + reschedule-all-on-open + missed-schedule catch-up) lands in
  Phase 2 with class reminders; Phase 4 only wires events into it.
- **Attendance:** manual per-session marking from Calendar day detail; stats on
  course page (present/absent/late counts, %); Today shows a weekly gauge.
- **Events:** unified kinds (assignment/test/quiz/club/meeting/other); exams and
  tasks show T-minus countdown chips + description line in Today and day detail.
- **GPA engine (`src/lib/gpa`, pure):** configurable scale (letter ↔ % bounds ↔
  points with gap/overlap validation), credit-weighted GPA, term + cumulative,
  include/exclude per course, rounding 0–3 decimals, **target-GPA solver**
  ("what average do I need") and **needed-on-final solver with feasibility
  bands**. Per-course final % = Σ(score/max × weight) over included grades,
  mapped to points through the active scale; GPA = Σ(points × credits) /
  Σ(credits). UI is the compact two-panel→mobile pattern (sticky gauge card +
  scrolling form), per the Hyperstart ROI reference — not a bare number
  adjuster.
- **Timer & promises:** free countdown per subject; promise progress =
  sum of `study_sessions.duration_min` falling inside the current
  day/week window ÷ `target_min` (capped at 100 %), rendered as tick bars;
  mascot blink on completion.
- **Vault:** folder cards → categories; import copies file into sandbox;
  open/rename/delete/describe; optional attach to events.
- **Backup:** manual export (ZIP: DB snapshot + files + manifest) via sharing
  sheet; import restores into a fresh DB (confirm overwrite); auto-backup
  triggered on app open when `backup_interval_days` elapsed.

## 7. Component research verdicts (stage-2)

- **Calendar:** `huanghaibin-dev/CalendarView` is Android Java, no RN wrapper
  exists → **design target only**. Implementation = flash-calendar month/week
  base + custom Reanimated 4 selection morph, dot markers, week↔month expand.
- **animata progress (`progress.tsx`):** extracted source, pure CSS → port to
  Reanimated 4 CSS transitions exactly (2 px × 12 px ticks, delay `i*6ms`,
  fill 75 ms).
- **liquid-bars:** actually a Three.js GLSL shader → recreate as Skia
  `RuntimeEffect` (SkSL) + Reanimated uniforms. No RN package exists.
- **GPA controls:** custom on `react-native-svg` + Reanimated (bundled with SDK
  57 → in Expo Go). Rejected: `react-native-circular-progress-indicator`
  (stale, peer conflict), `react-native-numeric-input` (deprecated),
  auraform-ui (web only).
- **Fonts:** all `@expo-google-fonts` packages verified available.
- **Approved gallery sources:** flash-calendar, 21st.dev, animata,
  taste.11xui, godly, 60fps.design, legendaryui, reactbits, uiverse;
  uidrop.dev dropped. Quality bar: "well made, compact and useful" (ROI
  calculator reference).

## 8. Phases (dependency order — build order)

1. **Foundation** — scaffold (`create-expo-app`, tabs router), design system
   (tokens, fonts, textures, primitives), Drizzle schema + migrations,
   courses/terms CRUD, settings shell.
2. **Schedule + Today** — patterns/exceptions, occurrence engine, week/month
   generation, Today hero + active session tick bar, reminders.
3. **Calendar** — month grid, selection morph, filter chips with counts, day
   detail, attendance marking + stats.
4. **Events** — event CRUD by kind, T-minus + descriptions, agenda lists,
   event reminders.
5. **GPA** — pure engine + tests, compact gauge screen, scale editor.
6. **Timer + promises** — arc timer, session logs, promises + tick bars,
   mascot moment.
7. **Vault** — folders, picker import, file actions, notes (teacher-said).
8. **Backup + polish** — ZIP export/import, auto-backup interval, haptics,
   grain/motion polish, QA pass.

## 9. Testing & quality gates

- **Unit tests (Jest):** `src/lib/gpa`, `src/lib/schedule` (pure; edge cases:
  term boundaries, cancelled sessions, scale gaps, solver feasibility).
- **Static gates:** `tsc --noEmit` (strict), ESLint, must pass per task.
- **On-device checklist per phase** (Expo Go, Android): smoke flow written
  into each phase's plan task; final phase runs a full QA checklist.
- **Delivery:** subagent-driven development — fresh implementer per task,
  task reviewer per task (spec + quality), fix loop ≤ 5 rounds, final
  whole-branch review, ledger-tracked.

## 10. Risks

| Risk | Mitigation |
|---|---|
| Expo Go module gaps (background tasks, push) | Design already avoids both; foreground-only backup policy |
| Doto numeric jitter | Verify advance widths in Phase 1; fallback VT323 |
| Skia liquid-bars shader cost on low-end Android | Use on one surface only (active class), pause when unfocused |
| Hermes + fflate zipSync perf | Smoke test in Phase 1; fallback: per-file copy manifest if slow |
| flash-calendar theming limits | Fork/wrap grid internals early in Phase 3, not at the end |
