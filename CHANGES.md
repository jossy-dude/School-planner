# What changed in this pass

**Home** — HeroCard shows course, time range + duration, countdown dial, a large tick bar, and a
"start focus timer" action that deep-links into Timer with the subject preselected. Pixel-dissolve
intro on first load. New: today's-classes strip, studied-today vs daily goal, "stitched" connectors
between cards, and a 3-layer parallax paper background (graph grid / smudges / content).

**Vault** — real feature: per-course Folder (tap to open) revealing a drag-through CardStack of that
course's files and notes; MISC folder for uncategorized files. Files can be added, opened/shared,
long-press deleted. Course pages have the same Files panel. Backup carries file *metadata* only.

**Calendar** — Pocket-Cal-style rounded day tiles with class-count badge, tag text (EXAM / n DUE / CLUB)
and course-colored dots. Tapping a day opens a full page: week strip + sections; hold an event and drag it
onto another day of the week to reschedule (time of day preserved). Classes open their course and take
attendance there.

**Nav** — floating pill tab bar + context-aware "+" (add course / file / event depending on tab).

**Feel** — SVG goo-filter blob back button (droplet pinches off) on every back button; two-layer paper
texture shader; faint "erased pencil" ghost marks in empty states.

**Sound** — synthesized (no samples): tab tick, timer start / final-5-seconds ticks / done chime, blob pop.
Regenerate with `python3 tools/make_sounds.py`. Toggle in Settings → Sound.

**Fixes** — event tickets open their detail page; class rows open their course.

Verified: `tsc`, `eslint`, Jest (59 suites / 313 tests) and a full `expo export --platform ios` bundle.
NOT verified: on-device visuals/animation feel and audio playback — run `npx expo start` and check.
