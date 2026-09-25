# School Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-only, paper-monochrome brutalist school planner (schedule, grades+GPA, study timer, vault, events, attendance) that runs entirely in Expo Go on Android.

**Architecture:** Expo Router tabs + SQLite (Drizzle) as source of truth with Zustand caches; all business logic in pure `src/lib/*` modules (Jest-tested, no RN imports); custom design system in `src/ui` (Reanimated 4 + react-native-svg + Skia grain); local notifications for reminders; ZIP export/import for backup.

**Tech Stack:** Expo SDK 57, TypeScript (strict), Expo Router, expo-sqlite + drizzle-orm@0.45.3, Zustand v5, Reanimated 4.5.1 + react-native-worklets, react-native-svg, @shopify/react-native-skia, @marceloterreiro/flash-calendar@2, fflate, jest-expo.

## Global Constraints

- Target runtime is **Expo Go on Android** (`expo@57.0.9+`). No native modules beyond what Expo Go ships; no EAS/dev-build; no push notifications (local notifications only).
- **TypeScript strict**: `npx tsc --noEmit` must pass after every task.
- **Lint**: `npx eslint .` must pass after every task.
- **No `mixBlendMode`** anywhere (broken on Android RN). No `expo-background-task`. Auto-backup triggers only on app open.
- All persistence goes through `src/db` (Drizzle). **No raw SQL outside `src/db`**. All pure logic lives in `src/lib/**` with zero `react-native` imports and its own Jest tests.
- Colors/spacing/typography come only from `src/ui/tokens.ts` — no hex literals in feature code.
- Fonts (exact family names): `BricolageGrotesque` (body), `Doto` (clock digits, weights 600/1000), `DSEG7` (LCD chips), `DotGothic16` (stamps), `ShareTechMono`, `Orbitron`, `VT323`.
- Course identity = emoji + accent color + pattern (`dots` | `stripes` | `grid`). Red `#C8352A` only for absence marks and destructive actions.
- No new npm dependencies outside the lists in Task 1 and Task 2.
- Commit after every task with a `feat:`/`fix:`/`chore:` message. Never commit with failing tsc/eslint/tests.
- Runtime is fully offline: no network calls in app code (font/asset downloads happen only in setup steps).

## File Structure

```
app/
  _layout.tsx              root Stack + font loading + GrainOverlay + migration gate
  (tabs)/_layout.tsx       6-tab nav with custom dot-indicator tabBar
  (tabs)/today.tsx         hero countdown, promises, due-soon, weekly gauge
  (tabs)/calendar.tsx      month grid, filters, day detail host
  (tabs)/courses.tsx       course list (folder cards)
  (tabs)/timer.tsx         arc timer, session history, promises
  (tabs)/vault.tsx         folder cards per course
  (tabs)/gpa.tsx           sticky gauge card + compact form
  course/[id].tsx          course page
  schedule-edit.tsx        modal: pattern / one-off editor
  event/[id].tsx           modal: event editor
  note-edit.tsx            modal: note editor
  settings.tsx             settings stack screen
src/
  db/schema.ts             Drizzle schema (all tables + relations)
  db/index.ts              openDatabaseSync + PRAGMA + migrations + exported db
  db/migrations/           drizzle-kit output (generated)
  lib/types.ts             shared domain types
  lib/schedule/            occurrences engine (pure)
  lib/gpa/                 GPA engine (pure)
  lib/reminders/           reminder planner (pure)
  lib/format/              date/time/number formatting helpers (pure)
  lib/backup/              serialize/parse/zip logic (pure)
  features/<name>/         store.ts + queries.ts + components/ per feature
  ui/                      tokens.ts, fonts.ts, GrainOverlay.tsx,
                           BrutCard.tsx, primitives.tsx, tickbar.tsx, PatternTile.tsx
scripts/                   (none required at runtime)
docs/superpowers/          specs/ + plans/
refrence/                  reference images (do not ship in app)
```

---

### Task 1: Scaffold + toolchain + dependency install

**Files:**
- Create: `package.json`, `app.json`, `tsconfig.json`, `babel.config.js`, `metro.config.js`, `.eslintrc`/eslint config, `jest.config.js`, `jest.setup.ts`
- Create: `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `app/(tabs)/{today,calendar,courses,timer,vault,gpa}.tsx`
- Delete: `App.tsx`, `index.ts` (from template)

**Interfaces:**
- Produces: project skeleton; all 6 tab routes exist and mount; scripts `test`, `typecheck`, `lint` in package.json.

- [ ] **Step 1: Scaffold from the blank-typescript template into a temp dir, then merge**

```bash
npx create-expo-app@latest /tmp/sp-scaffold -t blank-typescript --yes
rsync -a /tmp/sp-scaffold/ ./ --exclude .git --exclude refrence --exclude docs
rm -rf /tmp/sp-scaffold App.tsx index.ts
```

Expected: `package.json`, `app.json`, `tsconfig.json`, `assets/` now in project root; git status shows new files.

- [ ] **Step 2: Install runtime dependencies**

```bash
npx expo install expo-router react-native-safe-area-context react-native-screens \
  expo-linking expo-constants expo-status-bar react-native-reanimated \
  react-native-worklets react-native-gesture-handler react-native-svg \
  @shopify/react-native-skia expo-sqlite expo-crypto expo-notifications \
  expo-document-picker expo-file-system expo-sharing expo-haptics expo-font
npm i zustand drizzle-orm@0.45.3 @marceloterreiro/flash-calendar \
  @shopify/flash-list@^2 fflate
```

- [ ] **Step 3: Install dev dependencies**

```bash
npm i -D drizzle-kit@0.31.11 babel-plugin-inline-import jest jest-expo \
  @types/jest react-test-renderer
npx expo lint -- --yes 2>/dev/null || npx expo install eslint eslint-config-expo
```

- [ ] **Step 4: Configure package.json scripts and entry**

Edit `package.json`:
- `"main": "expo-router/entry"`
- scripts: `"test": "jest"`, `"typecheck": "tsc --noEmit"`, `"lint": "eslint ."`

- [ ] **Step 5: Configure app.json**

Add to `app.json` → `expo`:
```json
"scheme": "schoolplanner",
"plugins": ["expo-router"],
"experiments": { "typedRoutes": true }
```

- [ ] **Step 6: babel.config.js + metro.config.js (required by Drizzle expo driver)**

```js
// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
```

```js
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push('sql');
module.exports = config;
```

- [ ] **Step 7: jest.config.js + jest.setup.ts**

```js
// jest.config.js
module.exports = { preset: 'jest-expo', setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'] };
```

```ts
// jest.setup.ts
jest.mock('expo-sqlite', () => require('./src/db/__mocks__/expo-sqlite'));
```

- [ ] **Step 8: tsconfig strict**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

- [ ] **Step 9: Create tab routes (placeholder screens)**

```tsx
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '@/ui/tokens';

const ICONS: Record<string, string> = {
  today: '◉', calendar: '▦', courses: '▣',
  timer: '◷', vault: '▤', gpa: 'Ⓦ',
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.ink40,
        tabBarLabelStyle: { fontFamily: 'ShareTechMono', fontSize: 10 },
        tabBarStyle: { backgroundColor: colors.paper, borderTopColor: colors.ink15 },
      }}
      tabBar={undefined}
    >
      {Object.keys(ICONS).map((name) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: name.toUpperCase(),
            tabBarIcon: ({ color }) => (
              <Text style={{ color, fontSize: 18, fontFamily: 'ShareTechMono' }}>
                {ICONS[name]}
              </Text>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
```

Each of the 6 tab files:
```tsx
// app/(tabs)/today.tsx  (repeat with different title)
import { Text, View } from 'react-native';
export default function TodayScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>TODAY</Text>
    </View>
  );
}
```

- [ ] **Step 10: Root layout**

```tsx
// app/_layout.tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { colors } from '@/ui/tokens';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.paper },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="schedule-edit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="event/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="note-edit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="course/[id]" />
        <Stack.Screen name="settings" />
      </Stack>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 11: Create `src/ui/tokens.ts` (referenced above)**

```ts
export const colors = {
  paper: '#F4F1EA',
  paper2: '#EBE6DA',
  ink: '#141414',
  ink70: '#4A4A4A',
  ink40: '#8C8C8C',
  ink15: '#D9D4C7',
  black: '#000000',
  white: '#FFFFFF',
  danger: '#C8352A',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 4, md: 8, lg: 16, pill: 999 } as const;
export const fontFamilies = {
  body: 'BricolageGrotesque',
  mono: 'ShareTechMono',
  clock: 'Doto',
  lcd: 'DSEG7',
  stamp: 'DotGothic16',
  heading: 'Orbitron',
  pixel: 'VT323',
} as const;
export const hardShadow = {
  shadowColor: colors.ink,
  shadowOffset: { width: 3, height: 3 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 4,
} as const;
```

- [ ] **Step 12: Smoke test**

Create `src/ui/__tests__/tokens.test.ts`:
```ts
import { colors, fontFamilies } from '../tokens';

it('uses paper monochrome palette', () => {
  expect(colors.paper).toBe('#F4F1EA');
  expect(Object.keys(fontFamilies)).toEqual(
    expect.arrayContaining(['body', 'mono', 'clock', 'lcd', 'stamp']),
  );
});
```

- [ ] **Step 13: Run gates**

```bash
npx jest          # Expected: PASS (tokens test)
npx tsc --noEmit  # Expected: no errors
npx eslint .      # Expected: no errors
```
Fix any errors (unused imports in placeholders → add `// eslint-disable-next-line` or use the vars).

- [ ] **Step 14: On-device smoke**

Start `npx expo start`, open in Expo Go on Android. Expected: 6 tabs render, tab switching works, no red screen.

- [ ] **Step 15: Commit**

```bash
git add -A
git commit -m "feat: scaffold Expo Router app with toolchain, tokens, 6 tab routes"
```

---

### Task 2: Fonts

**Files:**
- Create: `assets/fonts/DSEG7Classic-Regular.ttf`, `assets/fonts/DSEG14Classic-Regular.ttf`
- Create: `src/ui/fonts.ts`, `src/ui/__tests__/fonts.test.ts`
- Modify: `app/_layout.tsx`

**Interfaces:**
- Produces: `FONTS` record (fontFamily name → source) exported from `@/ui/fonts`; `useFontsLoaded(): boolean` hook. All later tasks reference font family strings via `fontFamilies` (tokens) only.

- [ ] **Step 1: Download DSEG TTFs (23–29 KB each)**

```bash
mkdir -p assets/fonts
curl -fsSL -o /tmp/dseg.zip "https://github.com/keshikan/DSEG/releases/download/v0.46/fonts.zip" \
  || curl -fsSL -o /tmp/dseg.zip "https://github.com/keshikan/DSEG/archive/refs/tags/v0.46.zip"
cd /tmp && unzip -o -q dseg.zip -d dseg
find dseg -name 'DSEG7Classic-Regular.ttf' -exec cp {} /home/jossy/Documents/Projects/School-planner/assets/fonts/ \;
find dseg -name 'DSEG14Classic-Regular.ttf' -exec cp {} /home/jossy/Documents/Projects/School-planner/assets/fonts/ \;
ls -la /home/jossy/Documents/Projects/School-planner/assets/fonts/
```
Expected: both TTFs present and > 10 KB. If the release URL 404s, fetch `https://api.github.com/repos/keshikan/DSEG/releases/latest`, find the asset zip URL in the JSON, and retry with it.

- [ ] **Step 2: Install Google font packages**

```bash
npm i @expo-google-fonts/bricolage-grotesque @expo-google-fonts/doto \
  @expo-google-fonts/share-tech-mono @expo-google-fonts/orbitron \
  @expo-google-fonts/vt323 @expo-google-fonts/dotgothic16
```

- [ ] **Step 3: Subset DotGothic16 to latin (2 MB → ~45 KB)**

```bash
curl -fsSL -o /tmp/dg16.zip \
  "https://gwfh.mranftl.com/api/fonts/dotgothic16?download=zip&subsets=latin&variants=regular&formats=ttf"
cd /tmp && unzip -o -q dg16.zip && cp DotGothic16-Regular.ttf \
  /home/jossy/Documents/Projects/School-planner/assets/fonts/DotGothic16-Regular.ttf
```
If the API fails: keep the full `@expo-google-fonts/dotgothic16` package font instead (record `DONE_WITH_CONCERNS` noting size).

- [ ] **Step 4: Write `src/ui/fonts.ts`**

```ts
import { useFonts, BricolageGrotesque_400Regular, BricolageGrotesque_600SemiBold } from '@expo-google-fonts/bricolage-grotesque';
import { Doto_600SemiBold, Doto_900Black } from '@expo-google-fonts/doto';
import { ShareTechMono_400Regular } from '@expo-google-fonts/share-tech-mono';
import { Orbitron_500Medium } from '@expo-google-fonts/orbitron';
import { VT323_400Regular } from '@expo-google-fonts/vt323';

export const FONTS = {
  BricolageGrotesque_400Regular,
  BricolageGrotesque_600SemiBold,
  Doto_600SemiBold,
  Doto_900Black,
  ShareTechMono_400Regular,
  Orbitron_500Medium,
  VT323_400Regular,
  DotGothic16: require('../../assets/fonts/DotGothic16-Regular.ttf'),
  DSEG7Classic: require('../../assets/fonts/DSEG7Classic-Regular.ttf'),
  DSEG14Classic: require('../../assets/fonts/DSEG14Classic-Regular.ttf'),
} as const;

export function useFontsLoaded(): boolean {
  const [loaded] = useFonts(FONTS);
  return loaded;
}
```
If a named export above does not exist (package layout differs), run `node -e "console.log(Object.keys(require('@expo-google-fonts/doto')))"` and use the exported keys as-is — family strings must match what `useFonts` registers.

- [ ] **Step 5: Wire into root layout (migration gate pattern)**

In `app/_layout.tsx`, before rendering the Stack:
```tsx
import { useFontsLoaded } from '@/ui/fonts';
import { ActivityIndicator, View } from 'react-native';
import { colors } from '@/ui/tokens';

export default function RootLayout() {
  const fontsLoaded = useFontsLoaded();
  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.paper }}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }
  return ( /* existing GestureHandlerRootView + Stack */ );
}
```

- [ ] **Step 6: Test**

`src/ui/__tests__/fonts.test.ts`:
```ts
import { FONTS } from '../fonts';

it('registers every required family source', () => {
  expect(Object.keys(FONTS)).toEqual(
    expect.arrayContaining(['DotGothic16', 'DSEG7Classic', 'DSEG14Classic']),
  );
  expect(Object.keys(FONTS).length).toBeGreaterThanOrEqual(10);
});
```
Run: `npx jest && npx tsc --noEmit && npx eslint .`

- [ ] **Step 7: On-device smoke**

Expo Go: app opens (spinner → tabs), no font errors in Metro logs.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: load design fonts (Doto, DSEG7, DotGothic16, Bricolage, VT323, Orbitron, ShareTechMono)"
```

---

### Task 3: Grain overlay + BrutCard + press-depth

**Files:**
- Create: `src/ui/GrainOverlay.tsx`, `src/ui/BrutCard.tsx`, `src/ui/__tests__/brutcard.test.tsx`
- Modify: `app/_layout.tsx` (mount overlay)

**Interfaces:**
- Produces: `<GrainOverlay />` (absolute-fill, pointerEvents none); `<BrutCard onPress? style? children>` — hard offset shadow, press = translate(2,2) + shadow collapse.
- Consumes: `colors`, `spacing`, `radius`, `hardShadow` from `@/ui/tokens`.

- [ ] **Step 1: Write GrainOverlay (Skia static noise, no texture files, no mixBlendMode)**

```tsx
import { Canvas, Fill, Shader, useImageEffect, Skia } from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

const NOISE = Skia.RuntimeEffect.Make(`
uniform float2 uResolution;
float hash(float2 p) { return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453); }
fragment main(float2 xy) {
  float n = hash(floor(xy));
  return float4(n, n, n, 0.05);
}
`)!;

export function GrainOverlay() {
  const [effect] = useState(NOISE);
  if (!effect) return null;
  return (
    <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Fill>
        <Shader source={effect} uniforms={{ uResolution: [1, 1] }} />
      </Fill>
    </Canvas>
  );
}
```
If `Skia.RuntimeEffect.Make` returns null on device (shader compile), fall back to `<GrainOverlay />` returning `null` and record DONE_WITH_CONCERNS — grain is decorative.

- [ ] **Step 2: Write BrutCard with press-depth**

```tsx
import { ReactNode } from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors, hardShadow, radius } from '@/ui/tokens';

interface Props {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  depth?: number;
}

export function BrutCard({ children, onPress, style, depth = 3 }: Props) {
  const press = useSharedValue(0);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: press.value }, { translateY: press.value }],
    shadowOpacity: 1 - press.value / depth,
  }));
  const body = (
    <Animated.View
      style={[
        {
          backgroundColor: colors.paper2,
          borderRadius: radius.md,
          padding: 12,
          ...hardShadow,
          borderWidth: 1.5,
          borderColor: colors.ink,
        },
        animStyle,
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
  if (!onPress) return body;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => { press.value = withSpring(depth, { damping: 30, stiffness: 600 }); }}
      onPressOut={() => { press.value = withSpring(0, { damping: 30, stiffness: 600 }); }}
    >
      {body}
    </Pressable>
  );
}
```

- [ ] **Step 3: Mount GrainOverlay in root layout**

Add inside `GestureHandlerRootView`, after `<StatusBar />`:
```tsx
import { GrainOverlay } from '@/ui/GrainOverlay';
// ...
<GrainOverlay />
```

- [ ] **Step 4: Render test**

`src/ui/__tests__/brutcard.test.tsx`:
```tsx
import renderer from 'react-test-renderer';
import { BrutCard } from '../BrutCard';
import { Text } from 'react-native';

it('renders children inside a card', () => {
  const tree = renderer.create(
    <BrutCard><Text>hello</Text></BrutCard>,
  );
  expect(JSON.stringify(tree.toJSON())).toContain('hello');
});
```

- [ ] **Step 5: Gates**

`npx jest && npx tsc --noEmit && npx eslint .`

- [ ] **Step 6: On-device smoke** — cards render with hard shadow in Courses placeholder; press animates. Grain does not block touches.

- [ ] **Step 7: Commit**
```bash
git add -A
git commit -m "feat: design system base — grain overlay, BrutCard press-depth"
```

---

### Task 4: UI primitives + custom dot-indicator tab bar

**Files:**
- Create: `src/ui/primitives.tsx` (FilterChip, SegmentedChips, Stamp, SquareIconButton, TMinusChip, EmptyState)
- Create: `src/ui/__tests__/primitives.test.tsx`
- Modify: `app/(tabs)/_layout.tsx` (replace default tabBar)

**Interfaces:**
- Produces:
  - `<FilterChip label count active onPress />`
  - `<SegmentedChips options: string[] value onChange />` — sliding ink indicator
  - `<Stamp text />` — DotGothic16 box stamp
  - `<SquareIconButton glyph onPress tone?: 'ink'|'danger' />`
  - `<TMinusChip text />` — DSEG7 LCD chip
  - `<EmptyState glyph label />`
  - `DotTabBar` exported for `_layout.tsx`

- [ ] **Step 1: Write primitives**

```tsx
import { Pressable, Text, View, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors, fontFamilies, hardShadow, radius } from '@/ui/tokens';

export function FilterChip({ label, count, active, onPress }:
  { label: string; count?: number; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: radius.pill,
        borderWidth: 1.5,
        backgroundColor: active ? colors.ink : colors.paper,
        borderColor: colors.ink,
      }}
    >
      <Text style={{
        fontFamily: fontFamilies.mono, fontSize: 12,
        color: active ? colors.paper : colors.ink,
      }}>{label}</Text>
      {count !== undefined && (
        <View style={{
          minWidth: 18, paddingHorizontal: 4, borderRadius: radius.pill,
          backgroundColor: active ? colors.paper : colors.ink,
        }}>
          <Text style={{
            fontFamily: fontFamilies.lcd, fontSize: 10,
            color: active ? colors.ink : colors.paper, textAlign: 'center',
          }}>{count}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function SegmentedChips({ options, value, onChange }:
  { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={{
      flexDirection: 'row', backgroundColor: colors.paper,
      borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.ink, padding: 3,
    }}>
      {options.map((opt) => {
        const active = opt === value;
        return (
          <Pressable key={opt} onPress={() => onChange(opt)} style={{ flex: 1 }}>
            <View style={{
              paddingVertical: 6, borderRadius: radius.pill,
              backgroundColor: active ? colors.ink : 'transparent',
            }}>
              <Text style={{
                fontFamily: fontFamilies.mono, fontSize: 12, textAlign: 'center',
                color: active ? colors.paper : colors.ink40,
              }}>{opt}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Stamp({ text, tone = 'ink' }: { text: string; tone?: 'ink' | 'danger' }) {
  return (
    <View style={{
      borderWidth: 2, borderColor: tone === 'danger' ? colors.danger : colors.ink,
      paddingHorizontal: 8, paddingVertical: 2, transform: [{ rotate: '-6deg' }],
    }}>
      <Text style={{
        fontFamily: fontFamilies.stamp, fontSize: 14,
        color: tone === 'danger' ? colors.danger : colors.ink, letterSpacing: 2,
      }}>{text}</Text>
    </View>
  );
}

export function SquareIconButton({ glyph, onPress, tone = 'ink', size = 44 }:
  { glyph: string; onPress: () => void; tone?: 'ink' | 'danger'; size?: number }) {
  const press = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: press.value }, { translateY: press.value }],
    shadowOpacity: 1 - press.value / 3,
  }));
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => { press.value = withSpring(3, { damping: 30, stiffness: 700 }); }}
      onPressOut={() => { press.value = withSpring(0, { damping: 30, stiffness: 700 }); }}
    >
      <Animated.View style={[{
        width: size, height: size, backgroundColor: colors.paper,
        borderWidth: 2, borderColor: tone === 'danger' ? colors.danger : colors.ink,
        alignItems: 'center', justifyContent: 'center', ...hardShadow,
      }, style]}>
        <Text style={{ fontSize: size * 0.45, color: tone === 'danger' ? colors.danger : colors.ink }}>
          {glyph}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export function TMinusChip({ text }: { text: string }) {
  return (
    <View style={{
      backgroundColor: colors.ink, paddingHorizontal: 8, paddingVertical: 3,
      borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.ink,
    }}>
      <Text style={{ fontFamily: fontFamilies.lcd, fontSize: 13, color: colors.paper }}>
        {text}
      </Text>
    </View>
  );
}

export function EmptyState({ glyph, label }: { glyph: string; label: string }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 48, gap: 8 }}>
      <Text style={{ fontSize: 40, color: colors.ink15 }}>{glyph}</Text>
      <Text style={{ fontFamily: fontFamilies.mono, fontSize: 13, color: colors.ink40 }}>
        {label}
      </Text>
    </View>
  );
}
```

- [ ] **Step 2: Custom dot-indicator tab bar in `app/(tabs)/_layout.tsx`**

Replace the `tabBar={undefined}` with a custom bar:
```tsx
import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontFamilies, hardShadow, radius } from '@/ui/tokens';

const ICONS: Record<string, string> = {
  today: '◉', calendar: '▦', courses: '▣', timer: '◷', vault: '▤', gpa: 'Ⓦ',
};

function DotTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{
      flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
      backgroundColor: colors.paper, borderTopWidth: 1.5, borderTopColor: colors.ink,
      paddingHorizontal: 8, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 8),
    }}>
      {state.routes.map((route, i) => {
        const focused = state.index === i;
        return (
          <Pressable
            key={route.key}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            style={{ alignItems: 'center', gap: 3, width: 48 }}
          >
            <Text style={{
              fontSize: 17,
              color: focused ? colors.ink : colors.ink40,
              fontFamily: fontFamilies.mono,
            }}>{ICONS[route.name] ?? '•'}</Text>
            <View style={{
              width: 5, height: 5, borderRadius: 3,
              backgroundColor: focused ? colors.ink : 'transparent',
            }} />
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs tabBar={(p) => <DotTabBar {...p} />} screenOptions={{ headerShown: false }}>
      {Object.keys(ICONS).map((name) => (
        <Tabs.Screen key={name} name={name} options={{ title: name.toUpperCase() }} />
      ))}
    </Tabs>
  );
}
```
Add dependency if the type import fails: `npm i -D @types/react-navigation` is NOT needed — use `import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';` (ships with expo-router). If unresolved, define the prop type structurally: `{ state: { index: number; routes: { key: string; name: string }[] }; navigation: { emit: (e: unknown) => { defaultPrevented: boolean }; navigate: (name: string) => void } }`.

- [ ] **Step 3: Render tests**

`src/ui/__tests__/primitives.test.tsx`:
```tsx
import renderer from 'react-test-renderer';
import { FilterChip, TMinusChip, Stamp } from '../primitives';

const json = (n: React.ReactElement) => JSON.stringify(renderer.create(n).toJSON());

it('chip shows count', () => {
  expect(json(<FilterChip label="CLASSES" count={5} active onPress={() => {}} />)).toContain('5');
});
it('t-minus uses lcd text', () => {
  expect(json(<TMinusChip text="T-6D" />)).toContain('T-6D');
});
it('stamp renders text', () => {
  expect(json(<Stamp text="DONE" />)).toContain('DONE');
});
```

- [ ] **Step 4: Gates** — `npx jest && npx tsc --noEmit && npx eslint .`

- [ ] **Step 5: On-device smoke** — 6 tabs, custom bar with active dot, bar not overlapping content.

- [ ] **Step 6: Commit**
```bash
git add -A
git commit -m "feat: UI primitives and dot-indicator tab bar"
```

---
### Task 5: Drizzle schema + database bootstrap

**Files:**
- Create: `src/db/schema.ts`, `src/db/index.ts`, `src/db/__mocks__/expo-sqlite.ts`, `src/db/__tests__/schema.test.ts`
- Create: `drizzle.config.ts`
- Generated: `drizzle/0000_*.sql`, `drizzle/meta/*`, `drizzle/migrations.js`

**Interfaces:**
- Produces (used by every later task):
  - schema exports: `terms, courses, schedulePatterns, scheduleExceptions, attendance, events, gradeCategories, grades, gpaScales, studySessions, studyPromises, files, notes, settings` + matching `*Relations` + type aliases `Course = typeof courses.$inferSelect` etc.
  - `src/db/index.ts` exports: `db` (drizzle instance w/ schema), `migrateNow(): Promise<void>` (opens DB, PRAGMA foreign_keys=ON, runs migrations once).

- [ ] **Step 1: drizzle.config.ts**

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/drizzle',
  dialect: 'sqlite',
  driver: 'expo',
});
```

- [ ] **Step 2: Write the failing schema test**

`src/db/__tests__/schema.test.ts`:
```ts
import fs from 'node:fs';
import path from 'node:path';
import * as schema from '../schema';

const TABLES = [
  'terms', 'courses', 'schedule_patterns', 'schedule_exceptions', 'attendance',
  'events', 'grade_categories', 'grades', 'gpa_scales', 'study_sessions',
  'study_promises', 'files', 'notes', 'settings',
] as const;

it('exports a drizzle table for every domain table', () => {
  for (const t of TABLES) expect(schema).toHaveProperty(t);
});

it('generated migration creates every table with cascade from courses', () => {
  const dir = path.join(__dirname, '../drizzle');
  const file = fs.readdirSync(dir).find((f) => f.endsWith('.sql'));
  expect(file).toBeDefined();
  const sql = fs.readFileSync(path.join(dir, file!), 'utf8');
  for (const t of TABLES) expect(sql).toContain(`CREATE TABLE \`${t}\``);
  expect(sql).toContain('ON DELETE cascade');
  expect(sql.trimEnd().endsWith('statement-breakpoint')).toBe(false);
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npx jest src/db`
Expected: FAIL — `schema` module not found.

- [ ] **Step 4: Write `src/db/schema.ts`**

```ts
import { integer, real, sqliteTable, text, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';

const id = () => text('id').primaryKey().$defaultFn(() => Crypto.randomUUID());
const ts = () => integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date());

export const terms = sqliteTable('terms', {
  id: id(),
  name: text('name').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  updatedAt: ts(),
});

export const courses = sqliteTable('courses', {
  id: id(),
  termId: text('term_id').references(() => terms.id, { onDelete: 'set null' }),
  code: text('code').notNull().default(''),
  name: text('name').notNull(),
  emoji: text('emoji').notNull().default('📘'),
  color: text('color').notNull().default('#141414'),
  pattern: text('pattern', { enum: ['dots', 'stripes', 'grid'] }).notNull().default('dots'),
  bannerUri: text('banner_uri'),
  credits: real('credits').notNull().default(1),
  defaultDurationMin: integer('default_duration_min').notNull().default(60),
  reminderLeadOverrideMin: integer('reminder_lead_override_min'),
  updatedAt: ts(),
});

export const schedulePatterns = sqliteTable('schedule_patterns', {
  id: id(),
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  weekday: integer('weekday').notNull(), // 0 = Sunday
  startTime: text('start_time').notNull(), // "HH:MM"
  endTime: text('end_time').notNull(),
  location: text('location'),
  validFrom: text('valid_from'), // "YYYY-MM-DD"
  validTo: text('valid_to'),
  updatedAt: ts(),
}, (t) => [index('patterns_course_idx').on(t.courseId)]);

export const scheduleExceptions = sqliteTable('schedule_exceptions', {
  id: id(),
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  patternId: text('pattern_id').references(() => schedulePatterns.id, { onDelete: 'set null' }),
  date: text('date').notNull(), // "YYYY-MM-DD"
  kind: text('kind', { enum: ['one_off', 'cancelled'] }).notNull(),
  startTime: text('start_time'),
  endTime: text('end_time'),
  updatedAt: ts(),
}, (t) => [uniqueIndex('exc_course_date_uq').on(t.courseId, t.date)]);

export const attendance = sqliteTable('attendance', {
  id: id(),
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  status: text('status', { enum: ['present', 'absent', 'late', 'excused'] }).notNull(),
  note: text('note'),
  updatedAt: ts(),
}, (t) => [uniqueIndex('att_course_date_uq').on(t.courseId, t.date)]);

export const events = sqliteTable('events', {
  id: id(),
  kind: text('kind', { enum: ['assignment', 'test', 'quiz', 'club', 'meeting', 'other'] }).notNull(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  courseId: text('course_id').references(() => courses.id, { onDelete: 'set null' }),
  dueAt: integer('due_at', { mode: 'timestamp' }).notNull(),
  remindLeadOverrideMin: integer('remind_lead_override_min'),
  done: integer('done', { mode: 'boolean' }).notNull().default(false),
  updatedAt: ts(),
}, (t) => [index('events_due_idx').on(t.dueAt)]);

export const gradeCategories = sqliteTable('grade_categories', {
  id: id(),
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  weight: real('weight').notNull().default(1),
  updatedAt: ts(),
});

export const grades = sqliteTable('grades', {
  id: id(),
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  categoryId: text('category_id').references(() => gradeCategories.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  score: real('score').notNull(),
  maxScore: real('max_score').notNull().default(100),
  weightOverride: real('weight_override'),
  date: text('date').notNull(),
  note: text('note'),
  updatedAt: ts(),
}, (t) => [index('grades_course_idx').on(t.courseId)]);

export const gpaScales = sqliteTable('gpa_scales', {
  id: id(),
  name: text('name').notNull(),
  rows: text('rows', { mode: 'json' }).$type<{ letter: string; minPct: number; points: number }[]>().notNull(),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  updatedAt: ts(),
});

export const studySessions = sqliteTable('study_sessions', {
  id: id(),
  courseId: text('course_id').references(() => courses.id, { onDelete: 'set null' }),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  durationMin: integer('duration_min').notNull(),
  note: text('note'),
  updatedAt: ts(),
}, (t) => [index('sessions_started_idx').on(t.startedAt)]);

export const studyPromises = sqliteTable('study_promises', {
  id: id(),
  courseId: text('course_id').references(() => courses.id, { onDelete: 'set null' }),
  subject: text('subject').notNull(),
  targetMin: integer('target_min').notNull(),
  period: text('period', { enum: ['day', 'week'] }).notNull().default('day'),
  updatedAt: ts(),
});

export const files = sqliteTable('files', {
  id: id(),
  courseId: text('course_id').references(() => courses.id, { onDelete: 'set null' }),
  category: text('category', { enum: ['materials', 'assignments', 'submissions', 'other'] }).notNull().default('other'),
  name: text('name').notNull(),
  sandboxUri: text('sandbox_uri').notNull(),
  size: integer('size').notNull().default(0),
  mime: text('mime'),
  description: text('description'),
  addedAt: integer('added_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: ts(),
});

export const notes = sqliteTable('notes', {
  id: id(),
  courseId: text('course_id').references(() => courses.id, { onDelete: 'cascade' }),
  kind: text('kind', { enum: ['teacher_said', 'exam_tip'] }).notNull(),
  body: text('body').notNull(),
  description: text('description'),
  updatedAt: ts(),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value', { mode: 'json' }).$type<unknown>().notNull(),
  updatedAt: ts(),
});

export const termsRelations = relations(terms, ({ many }) => ({ courses: many(courses) }));
export const coursesRelations = relations(courses, ({ one, many }) => ({
  term: one(terms, { fields: [courses.termId], references: [terms.id] }),
  patterns: many(schedulePatterns),
  grades: many(grades),
  files: many(files),
  notes: many(notes),
}));
export const schedulePatternsRelations = relations(schedulePatterns, ({ one }) => ({
  course: one(courses, { fields: [schedulePatterns.courseId], references: [courses.id] }),
}));
export const gradeCategoriesRelations = relations(gradeCategories, ({ one, many }) => ({
  course: one(courses, { fields: [gradeCategories.courseId], references: [courses.id] }),
  grades: many(grades),
}));
export const gradesRelations = relations(grades, ({ one }) => ({
  course: one(courses, { fields: [grades.courseId], references: [courses.id] }),
  category: one(gradeCategories, { fields: [grades.categoryId], references: [gradeCategories.id] }),
}));

export type Term = typeof terms.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type Pattern = typeof schedulePatterns.$inferSelect;
export type ScheduleException = typeof scheduleExceptions.$inferSelect;
export type Attendance = typeof attendance.$inferSelect;
export type SchoolEvent = typeof events.$inferSelect;
export type GradeCategory = typeof gradeCategories.$inferSelect;
export type Grade = typeof grades.$inferSelect;
export type GpaScale = typeof gpaScales.$inferSelect;
export type StudySession = typeof studySessions.$inferSelect;
export type StudyPromise = typeof studyPromises.$inferSelect;
export type StoredFile = typeof files.$inferSelect;
export type Note = typeof notes.$inferSelect;
```

- [ ] **Step 5: Generate the migration**

Run: `npx drizzle-kit generate`
Expected: `src/db/drizzle/0000_*.sql`, `src/db/drizzle/meta/`, `src/db/drizzle/migrations.js`.
Verify no trailing `--> statement-breakpoint` at end of the .sql (drizzle issue #6207 crashes native); if present, remove that last line.

- [ ] **Step 6: Write `src/db/index.ts`**

```ts
import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from './drizzle/migrations';
import * as schema from './schema';

export const expoDb = SQLite.openDatabaseSync('school-planner.db');
export const db = drizzle(expoDb, { schema });

let migrated = false;
export async function migrateNow(): Promise<void> {
  if (migrated) return;
  expoDb.execSync('PRAGMA foreign_keys = ON');
  expoDb.execSync('PRAGMA journal_mode = WAL');
  await migrate(db, migrations);
  migrated = true;
}
```
If `execSync` is unavailable on the client object, use `expoDb.execAsync(...)` inside `migrateNow` (it is async).

- [ ] **Step 7: Jest mock for expo-sqlite**

`src/db/__mocks__/expo-sqlite.ts`:
```ts
export const openDatabaseSync = () => ({
  execSync: () => {},
  execAsync: async () => {},
  runSync: () => {},
  getAllSync: () => [],
});
```

- [ ] **Step 8: Run tests + gates**

Run: `npx jest src/db && npx tsc --noEmit && npx eslint .`
Expected: PASS.

- [ ] **Step 9: Wire migration gate into `app/_layout.tsx`**

```tsx
const [ready, setReady] = useState(false);
useEffect(() => { migrateNow().then(() => setReady(true)); }, []);
// render ActivityIndicator until ready (same branch as fonts gate)
```

- [ ] **Step 10: On-device smoke** — app opens; `adb`-free check: add temporary `console.log(await db.select().from(schema.terms))` in a dev screen or use Expo Go — no crash = success; remove log after.

- [ ] **Step 11: Commit**
```bash
git add -A
git commit -m "feat: drizzle schema for all 14 tables with migrations and db bootstrap"
```

---

### Task 6: Courses + terms CRUD

**Files:**
- Create: `src/features/courses/logic.ts`, `src/features/courses/__tests__/logic.test.ts`
- Create: `src/features/courses/queries.ts`, `src/features/courses/store.ts`
- Create: `src/features/courses/components/{CourseFolderCard,PatternTile,CourseForm}.tsx`
- Modify: `app/(tabs)/courses.tsx`, create `app/course/[id].tsx`

**Interfaces:**
- Consumes: `db`, schema types from `@/db`, `BrutCard`, `EmptyState`, `SquareIconButton` from `@/ui`, tokens.
- Produces:
  - `validateCourse(input): { ok: true; value: CourseDraft } | { ok: false; error: string }` (pure)
  - `useCourses(): Course[]`, `createCourse(draft): Promise<Course>`, `updateCourse(id, patch): Promise<void>`, `deleteCourse(id): Promise<void>`
  - `PatternTile({ color, pattern, style })` — course identity texture (dots/stripes/grid)
  - Route `app/course/[id].tsx` — course page shell (banner + info; sections added in later tasks)

- [ ] **Step 1: Write failing logic tests**

`src/features/courses/__tests__/logic.test.ts`:
```ts
import { validateCourse } from '../logic';

it('accepts a minimal course and fills defaults', () => {
  const r = validateCourse({ name: 'Maths', credits: 3, defaultDurationMin: 60 });
  expect(r.ok).toBe(true);
  if (r.ok) {
    expect(r.value.emoji).toBe('📘');
    expect(r.value.pattern).toBe('dots');
    expect(r.value.color).toBe('#141414');
  }
});

it('rejects empty name and negative credits', () => {
  expect(validateCourse({ name: '  ', credits: 1 }).ok).toBe(false);
  expect(validateCourse({ name: 'Maths', credits: -1 }).ok).toBe(false);
});

it('rejects duration under 5 minutes', () => {
  expect(validateCourse({ name: 'Maths', defaultDurationMin: 4 }).ok).toBe(false);
});

it('defaults invalid pattern/color to safe values', () => {
  const r = validateCourse({ name: 'Art', pattern: 'zigzag' as never, color: 'not-a-color' });
  expect(r.ok).toBe(true);
  if (r.ok) { expect(r.value.pattern).toBe('dots'); expect(r.value.color).toBe('#141414'); }
});
```

- [ ] **Step 2: Run to verify failure** — `npx jest src/features/courses` → FAIL (`../logic` not found).

- [ ] **Step 3: Implement `src/features/courses/logic.ts`**

```ts
import { Course } from '@/db/schema';

export interface CourseDraft {
  name: string;
  code: string;
  emoji: string;
  color: string;
  pattern: 'dots' | 'stripes' | 'grid';
  credits: number;
  defaultDurationMin: number;
  termId: string | null;
  reminderLeadOverrideMin: number | null;
}

type Input = Partial<CourseDraft>;

export function validateCourse(input: Input):
  | { ok: true; value: CourseDraft }
  | { ok: false; error: string } {
  const name = (input.name ?? '').trim();
  if (!name) return { ok: false, error: 'Name required' };
  const credits = input.credits ?? 1;
  if (!Number.isFinite(credits) || credits < 0) return { ok: false, error: 'Credits must be ≥ 0' };
  const duration = input.defaultDurationMin ?? 60;
  if (!Number.isFinite(duration) || duration < 5) return { ok: false, error: 'Duration must be ≥ 5 min' };
  const patterns = ['dots', 'stripes', 'grid'] as const;
  const pattern = patterns.includes(input.pattern as never) ? input.pattern! : 'dots';
  const color = /^#[0-9A-Fa-f]{6}$/.test(input.color ?? '') ? input.color! : '#141414';
  return {
    ok: true,
    value: {
      name,
      code: (input.code ?? '').trim(),
      emoji: input.emoji?.trim() || '📘',
      color,
      pattern,
      credits,
      defaultDurationMin: duration,
      termId: input.termId ?? null,
      reminderLeadOverrideMin: input.reminderLeadOverrideMin ?? null,
    },
  };
}

export function courseFolderLabel(c: Pick<Course, 'code' | 'name'>): string {
  return c.code ? `${c.code} · ${c.name}` : c.name;
}
```

- [ ] **Step 4: Verify tests pass** — `npx jest src/features/courses` → PASS.

- [ ] **Step 5: Queries + store**

`src/features/courses/queries.ts`:
```ts
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { courses, Course } from '@/db/schema';
import { CourseDraft } from './logic';

export async function listCourses(): Promise<Course[]> {
  return db.select().from(courses).orderBy(courses.name);
}

export async function getCourse(id: string): Promise<Course | undefined> {
  const [row] = await db.select().from(courses).where(eq(courses.id, id));
  return row;
}

export async function insertCourse(draft: CourseDraft): Promise<Course> {
  const [row] = await db.insert(courses).values(draft).returning();
  return row;
}

export async function patchCourse(id: string, patch: Partial<CourseDraft>): Promise<void> {
  await db.update(courses).set({ ...patch, updatedAt: new Date() }).where(eq(courses.id, id));
}

export async function removeCourse(id: string): Promise<void> {
  await db.delete(courses).where(eq(courses.id, id));
}
```

`src/features/courses/store.ts`:
```ts
import { create } from 'zustand';
import { Course } from '@/db/schema';
import { listCourses, insertCourse, patchCourse, removeCourse } from './queries';
import { CourseDraft } from './logic';

interface CoursesState {
  courses: Course[];
  loaded: boolean;
  refresh: () => Promise<void>;
  create: (draft: CourseDraft) => Promise<Course>;
  update: (id: string, patch: Partial<CourseDraft>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useCoursesStore = create<CoursesState>((set, get) => ({
  courses: [],
  loaded: false,
  refresh: async () => set({ courses: await listCourses(), loaded: true }),
  create: async (draft) => {
    const row = await insertCourse(draft);
    await get().refresh();
    return row;
  },
  update: async (id, patch) => {
    await patchCourse(id, patch);
    await get().refresh();
  },
  remove: async (id) => {
    await removeCourse(id);
    await get().refresh();
  },
}));
```

- [ ] **Step 6: PatternTile component**

`src/features/courses/components/PatternTile.tsx`:
```tsx
import { memo } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { colors } from '@/ui/tokens';

interface Props { color: string; pattern: 'dots' | 'stripes' | 'grid'; height?: number; style?: StyleProp<ViewStyle> }

function PatternTileBase({ color, pattern, height = 72, style }: Props) {
  const cells: React.ReactNode[] = [];
  const cols = 14;
  if (pattern === 'dots') {
    for (let i = 0; i < cols * 3; i++) {
      cells.push(<View key={i} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: color }} />);
    }
  } else if (pattern === 'stripes') {
    for (let i = 0; i < 14; i++) {
      cells.push(<View key={i} style={{ width: 4, height: '160%', backgroundColor: color, transform: [{ rotate: '35deg' }] }} />);
    }
  } else {
    for (let i = 0; i < cols * 3; i++) {
      cells.push(<View key={i} style={{ width: 4, height: 4, borderWidth: 1, borderColor: color }} />);
    }
  }
  return (
    <View style={[{ height, backgroundColor: colors.paper2, flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 8, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, style]}>
      {cells}
    </View>
  );
}
export const PatternTile = memo(PatternTileBase);
```

- [ ] **Step 7: CourseForm + list screen + course page**

`src/features/courses/components/CourseForm.tsx`: modal-ready form with fields (name, code, emoji — 6 fixed emoji choices `📘 🧮 🔬 📕 🎨 🌍`, color — 8 swatch buttons `['#141414','#C8352A','#2E6B4F','#3B5BA5','#B5852A','#7A3B8F','#2A7F8F','#5C5C5C']`, pattern — 3 chips, credits — stepper, duration — stepper), submit button. On submit: `validateCourse` → `useCoursesStore().create/update` → `router.back()`. Show `error` text under the form on failure.

`app/(tabs)/courses.tsx`:
```tsx
import { useCallback, useEffect } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useCoursesStore } from '@/features/courses/store';
import { PatternTile } from '@/features/courses/components/PatternTile';
import { courseFolderLabel } from '@/features/courses/logic';
import { EmptyState, SquareIconButton } from '@/ui/primitives';
import { colors, fontFamilies, hardShadow, radius } from '@/ui/tokens';

export default function CoursesScreen() {
  const { courses, refresh } = useCoursesStore();
  useEffect(() => { refresh(); }, [refresh]);
  const renderItem = useCallback(({ item }: { item: (typeof courses)[number] }) => (
    <Pressable onPress={() => router.push({ pathname: '/course/[id]', params: { id: item.id } })}
      style={{ marginBottom: 12, borderWidth: 2, borderColor: colors.ink, borderRadius: radius.md, backgroundColor: colors.paper2, overflow: 'hidden', ...hardShadow }}>
      <PatternTile color={item.color} pattern={item.pattern} height={64} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 }}>
        <Text style={{ fontSize: 22, color: item.emoji ? undefined : undefined }}>{item.emoji}</Text>
        <Text style={{ flex: 1, marginLeft: 8, fontFamily: fontFamilies.body, fontWeight: '600', fontSize: 15, color: colors.ink }}>
          {courseFolderLabel(item)}
        </Text>
        <Text style={{ fontFamily: fontFamilies.lcd, fontSize: 13, color: colors.ink40 }}>
          {item.credits}CR
        </Text>
      </View>
    </Pressable>
  ), []);
  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, padding: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
        <Text style={{ fontFamily: fontFamilies.heading, fontSize: 18, color: colors.ink }}>COURSES</Text>
        <SquareIconButton glyph="+" onPress={() => router.push('/course/[id]')} />
      </View>
      {courses.length === 0
        ? <EmptyState glyph="▣" label="no courses yet — tap +" />
        : <FlatList data={courses} keyExtractor={(c) => c.id} renderItem={renderItem} />}
    </View>
  );
}
```
Note: the `+` pushes a new-course route; implement `app/course/[id].tsx` to handle `id === 'new'` (render `CourseForm` in create mode) and existing ids (banner = PatternTile + emoji + name + code/credits/duration row + placeholder sections that later tasks fill: SCHEDULE, GRADES, NOTES, FILES, ATTENDANCE — each rendering `EmptyState` until those tasks land).

- [ ] **Step 8: Gates + on-device**

`npx jest && npx tsc --noEmit && npx eslint .`
Device: create a course (emoji/color/pattern), it appears in list with texture banner; open course page; edit name; delete works (confirm dialog via `Alert.alert`).

- [ ] **Step 9: Commit**
```bash
git add -A
git commit -m "feat: courses CRUD with pattern identity tiles and course page shell"
```

---

### Task 7: Settings store + settings screen shell

**Files:**
- Create: `src/features/settings/store.ts`, `src/features/settings/queries.ts`, `src/features/settings/__tests__/store.test.ts`
- Modify: `app/settings.tsx`, `app/(tabs)/today.tsx` (gear entry point)

**Interfaces:**
- Consumes: `db`, `settings` table.
- Produces:
  - `DEFAULT_SETTINGS` object (typed) + `useSettings(): { get<K>(key): ...; set(key, value) }` store
  - Settings keys (exact): `reminder_lead_default_min: number (60)`, `study_goal_min: number (120)`, `week_start: 'sunday'|'monday' ('monday')`, `gpa_scale_id: string|null`, `gpa_rounding: number (2)`, `gpa_excluded: string[] ([])`, `backup_interval_days: number (7)`, `backup_last_at: number|null`
  - Settings screen with sections: REMINDERS, STUDY, WEEK, BACKUP (interval picker — export/import buttons added in Task 25 as placeholders showing "—" ), GPA (scale editor added in Task 20)

- [ ] **Step 1: Failing test — settings defaults + merge**

`src/features/settings/__tests__/store.test.ts`:
```ts
import { DEFAULT_SETTINGS, mergeSettings } from '../logic';

it('ships the spec defaults', () => {
  expect(DEFAULT_SETTINGS.reminder_lead_default_min).toBe(60);
  expect(DEFAULT_SETTINGS.week_start).toBe('monday');
  expect(DEFAULT_SETTINGS.backup_interval_days).toBe(7);
  expect(DEFAULT_SETTINGS.gpa_rounding).toBe(2);
  expect(DEFAULT_SETTINGS.study_goal_min).toBe(120);
});

it('merge ignores unknown keys and wrong types', () => {
  const merged = mergeSettings(DEFAULT_SETTINGS, { reminder_lead_default_min: 15, bogus: 1, study_goal_min: 'high' } as never);
  expect(merged.reminder_lead_default_min).toBe(15);
  expect('bogus' in merged).toBe(false);
  expect(merged.study_goal_min).toBe(DEFAULT_SETTINGS.study_goal_min);
});
```

- [ ] **Step 2: Run to verify failure** — `npx jest src/features/settings` → FAIL.

- [ ] **Step 3: `src/features/settings/logic.ts`**

```ts
export const DEFAULT_SETTINGS = {
  reminder_lead_default_min: 60,
  study_goal_min: 120,
  week_start: 'monday',
  gpa_scale_id: null,
  gpa_rounding: 2,
  gpa_excluded: [] as string[],
  backup_interval_days: 7,
  backup_last_at: null,
} as const;

export type Settings = {
  -readonly [K in keyof typeof DEFAULT_SETTINGS]: (typeof DEFAULT_SETTINGS)[K];
};

export function mergeSettings(base: Settings, patch: Record<string, unknown>): Settings {
  const out = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (!(k in DEFAULT_SETTINGS)) continue;
    const def = (DEFAULT_SETTINGS as Record<string, unknown>)[k];
    if (typeof def === 'number' && typeof v === 'number') (out as Record<string, unknown>)[k] = v;
    else if (typeof def === 'string' && typeof v === 'string') (out as Record<string, unknown>)[k] = v;
    else if (Array.isArray(def) && Array.isArray(v)) (out as Record<string, unknown>)[k] = v;
    else if (def === null && (v === null || typeof v === 'number' || typeof v === 'string')) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}
```

- [ ] **Step 4: Tests pass, then queries + store**

`src/features/settings/queries.ts`: `readAllSettings(): Promise<Partial<Settings>>` (select all rows → object), `writeSetting(key, value)` (upsert).
`src/features/settings/store.ts`:
```ts
import { create } from 'zustand';
import { DEFAULT_SETTINGS, Settings } from './logic';
import { readAllSettings, writeSetting } from './queries';

interface SettingsState {
  settings: Settings;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: { ...DEFAULT_SETTINGS },
  hydrated: false,
  hydrate: async () => {
    const stored = await readAllSettings();
    set({ settings: { ...DEFAULT_SETTINGS, ...stored } as Settings, hydrated: true });
  },
  set: async (key, value) => {
    set({ settings: { ...get().settings, [key]: value } });
    await writeSetting(key, value);
  },
}));
```

- [ ] **Step 5: `app/settings.tsx` shell**

Sections rendered as BrutCards with rows: label (mono) + control (stepper/chip row). Controls implemented here: number steppers for `reminder_lead_default_min` (steps of 15, 0–24h), `study_goal_min` (steps of 30), `backup_interval_days` (chips 1/3/7/14), week start segmented (SUN/MON). Placeholder rows for BACKUP (disabled `EXPORT ZIP`/`IMPORT` buttons) and GPA (`OPEN SCALE EDITOR` disabled) get wired in Tasks 20/25 — render them with `EmptyState`-style "—" values, NOT disabled code paths that later tasks must rewrite.

Add gear entry: in `app/(tabs)/today.tsx`, top-right `<SquareIconButton glyph="⚙" onPress={() => router.push('/settings')} />`.

- [ ] **Step 6: Gates + device** — settings persist across app reload (change study goal → kill app → reopen → value kept).

- [ ] **Step 7: Commit**
```bash
git add -A
git commit -m "feat: settings persistence with defaults and settings screen shell"
```

---
### Task 8: Schedule occurrence engine (pure)

**Files:**
- Create: `src/lib/schedule/index.ts`, `src/lib/schedule/__tests__/occurrences.test.ts`

**Interfaces:**
- Produces (consumed by Tasks 10, 11, 12, 13, 14, 17):
```ts
export interface PatternInput { id: string; courseId: string; weekday: number; startTime: string; endTime: string; validFrom?: string | null; validTo?: string | null; }
export interface ExceptionInput { id: string; courseId: string; patternId?: string | null; date: string; kind: 'one_off' | 'cancelled'; startTime?: string | null; endTime?: string | null; }
export interface Occurrence {
  id: string;            // stable: `${patternId}:${date}` or `oneoff:${exceptionId}`
  courseId: string;
  dateId: string;        // "YYYY-MM-DD"
  startMs: number;       // epoch ms (local time)
  endMs: number;
  patternId: string | null;
  kind: 'pattern' | 'one_off';
}
export function occurrencesInRange(patterns: PatternInput[], exceptions: ExceptionInput[], rangeStartMs: number, rangeEndMs: number): Occurrence[];
export function occurrencesOnDay(patterns: PatternInput[], exceptions: ExceptionInput[], dateId: string): Occurrence[];
export function classifySessionState(nowMs: number, occ: Occurrence): 'upcoming' | 'active' | 'ended';
```
Rules (from spec): patterns recur weekly within validFrom/validTo; `cancelled` exceptions delete the matching occurrence that day; `one_off` exceptions add an occurrence (using exception start/end if given, else course default duration is NOT applied here — one-offs must carry times; if missing times, skip and it's a data error surfaced by validation); overlapping same-course patterns are allowed.

- [ ] **Step 1: Failing tests**

`src/lib/schedule/__tests__/occurrences.test.ts`:
```ts
import { classifySessionState, occurrencesOnDay } from '../index';
import { PatternInput, ExceptionInput } from '../index';

// Helper: build local-time "HH:MM" epoch for 2026-09-28 (Monday, weekday 1)
const DAY = '2026-09-28';
const dayStart = new Date(2026, 8, 28).getTime();
const at = (h: number, m = 0) => dayStart + h * 3600_000 + m * 60_000;

const p1: PatternInput = { id: 'p1', courseId: 'c1', weekday: 1, startTime: '09:00', endTime: '10:30', validFrom: null, validTo: null };

it('emits an occurrence for a matching weekday', () => {
  const occ = occurrencesOnDay([p1], [], DAY);
  expect(occ).toHaveLength(1);
  expect(occ[0]!.startMs).toBe(at(9));
  expect(occ[0]!.endMs).toBe(at(10, 30));
  expect(occ[0]!.id).toBe('p1:2026-09-28');
});

it('no occurrence on other weekdays', () => {
  expect(occurrencesOnDay([p1], [], '2026-09-29')).toHaveLength(0);
});

it('cancelled exception removes the occurrence', () => {
  const ex: ExceptionInput = { id: 'e1', courseId: 'c1', patternId: 'p1', date: DAY, kind: 'cancelled' };
  expect(occurrencesOnDay([p1], [ex], DAY)).toHaveLength(0);
});

it('one_off exception adds a class with explicit times', () => {
  const ex: ExceptionInput = { id: 'e2', courseId: 'c1', date: DAY, kind: 'one_off', startTime: '14:00', endTime: '15:00' };
  const occ = occurrencesOnDay([], [ex], DAY);
  expect(occ).toHaveLength(1);
  expect(occ[0]!.kind).toBe('one_off');
  expect(occ[0]!.startMs).toBe(at(14));
});

it('one_off without times is skipped', () => {
  const ex: ExceptionInput = { id: 'e3', courseId: 'c1', date: DAY, kind: 'one_off' };
  expect(occurrencesOnDay([], [ex], DAY)).toHaveLength(0);
});

it('respects validFrom/validTo window', () => {
  const p: PatternInput = { ...p1, validFrom: '2026-10-01', validTo: '2026-10-31' };
  expect(occurrencesOnDay([p], [], DAY)).toHaveLength(0);
  expect(occurrencesOnDay([p], [], '2026-10-05')).toHaveLength(1);
});

it('crosses midnight when endTime <= startTime (end next day)', () => {
  const p: PatternInput = { ...p1, startTime: '23:00', endTime: '01:00' };
  const [occ] = occurrencesOnDay([p], [], DAY);
  expect(occ!.endMs).toBe(at(25)); // next day 01:00
});

it('classifySessionState buckets by now', () => {
  const occ = occurrencesOnDay([p1], [], DAY)[0]!;
  expect(classifySessionState(at(8), occ)).toBe('upcoming');
  expect(classifySessionState(at(9, 30), occ)).toBe('active');
  expect(classifySessionState(at(11), occ)).toBe('ended');
});
```

- [ ] **Step 2: Run to verify failure** — `npx jest src/lib/schedule` → FAIL.

- [ ] **Step 3: Implement `src/lib/schedule/index.ts`**

```ts
export interface PatternInput { id: string; courseId: string; weekday: number; startTime: string; endTime: string; validFrom?: string | null; validTo?: string | null; }
export interface ExceptionInput { id: string; courseId: string; patternId?: string | null; date: string; kind: 'one_off' | 'cancelled'; startTime?: string | null; endTime?: string | null; }
export interface Occurrence {
  id: string; courseId: string; dateId: string;
  startMs: number; endMs: number; patternId: string | null; kind: 'pattern' | 'one_off';
}

export function toDateId(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function parseDateId(dateId: string): Date {
  const [y, m, d] = dateId.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
}

function timeOnDay(dateId: string, hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return parseDateId(dateId).getTime() + (h ?? 0) * 3600_000 + (m ?? 0) * 60_000;
}

function weekdayOf(dateId: string): number {
  return parseDateId(dateId).getDay();
}

function inWindow(dateId: string, from?: string | null, to?: string | null): boolean {
  if (from && dateId < from) return false;
  if (to && dateId > to) return false;
  return true;
}

export function occurrencesOnDay(
  patterns: PatternInput[], exceptions: ExceptionInput[], dateId: string,
): Occurrence[] {
  const out: Occurrence[] = [];
  const cancelled = new Set(
    exceptions.filter((e) => e.date === dateId && e.kind === 'cancelled' && e.patternId)
      .map((e) => e.patternId!),
  );
  for (const p of patterns) {
    if (weekdayOf(dateId) !== p.weekday) continue;
    if (!inWindow(dateId, p.validFrom, p.validTo)) continue;
    if (cancelled.has(p.id)) continue;
    const startMs = timeOnDay(dateId, p.startTime);
    const endMsRaw = timeOnDay(dateId, p.endTime);
    const endMs = endMsRaw > startMs ? endMsRaw : endMsRaw + 86_400_000;
    out.push({ id: `${p.id}:${dateId}`, courseId: p.courseId, dateId, startMs, endMs, patternId: p.id, kind: 'pattern' });
  }
  for (const e of exceptions) {
    if (e.date !== dateId || e.kind !== 'one_off') continue;
    if (!e.startTime || !e.endTime) continue;
    const startMs = timeOnDay(dateId, e.startTime);
    const endMsRaw = timeOnDay(dateId, e.endTime);
    const endMs = endMsRaw > startMs ? endMsRaw : endMsRaw + 86_400_000;
    out.push({ id: `oneoff:${e.id}`, courseId: e.courseId, dateId, startMs, endMs, patternId: null, kind: 'one_off' });
  }
  return out.sort((a, b) => a.startMs - b.startMs);
}

export function occurrencesInRange(
  patterns: PatternInput[], exceptions: ExceptionInput[], rangeStartMs: number, rangeEndMs: number,
): Occurrence[] {
  const out: Occurrence[] = [];
  const cur = new Date(rangeStartMs);
  cur.setHours(0, 0, 0, 0);
  while (cur.getTime() <= rangeEndMs) {
    out.push(...occurrencesOnDay(patterns, exceptions, toDateId(cur)));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function classifySessionState(nowMs: number, occ: Occurrence): 'upcoming' | 'active' | 'ended' {
  if (nowMs < occ.startMs) return 'upcoming';
  if (nowMs < occ.endMs) return 'active';
  return 'ended';
}
```

- [ ] **Step 4: Tests pass + gates** — `npx jest src/lib/schedule && npx tsc --noEmit && npx eslint .`

- [ ] **Step 5: Commit**
```bash
git add -A
git commit -m "feat: pure schedule occurrence engine with tests"
```

---

### Task 9: Schedule editor (patterns + exceptions)

**Files:**
- Create: `src/features/schedule/queries.ts`, `src/features/schedule/store.ts`
- Create: `src/features/schedule/components/{PatternRow,TimeField,WeekdayChips}.tsx`
- Modify: `app/schedule-edit.tsx` (modal), `app/course/[id].tsx` (SCHEDULE section), `app/(tabs)/courses.tsx` (no change — entry is course page)

**Interfaces:**
- Consumes: schema `schedulePatterns`, `scheduleExceptions`; `PatternInput`/`ExceptionInput` types.
- Produces:
  - `useSchedule(): { patterns, exceptions, refresh, savePattern(patch): Promise, removePattern(id), saveException(patch), removeException(id) }`
  - `TimeField({ value, onChange })` — two digit inputs HH:MM with validation (00:00–23:59), invalid shows danger border.
  - `WeekdayChips({ value: number, onChange })` — 7 square toggles S M T W T F S.
  - Course page SCHEDULE section lists that course's patterns as rows with edit/delete; `+` opens `app/schedule-edit.tsx?courseId=…`.

- [ ] **Step 1: `TimeField` + validation logic test (pure)**

`src/features/schedule/__tests__/time.test.ts`:
```ts
import { normalizeTime, isValidTime } from '../logic';
it('validates HH:MM', () => {
  expect(isValidTime('09:00')).toBe(true);
  expect(isValidTime('23:59')).toBe(true);
  expect(isValidTime('24:00')).toBe(false);
  expect(isValidTime('9:0')).toBe(false);
});
it('normalize pads input', () => {
  expect(normalizeTime('95')).toBe('09:05');
  expect(normalizeTime('')).toBe('');
});
```
Run → FAIL → implement `src/features/schedule/logic.ts`:
```ts
export function isValidTime(v: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(v)) return false;
  const [h, m] = v.split(':').map(Number);
  return h! < 24 && m! < 60;
}
export function normalizeTime(v: string): string {
  const digits = v.replace(/\D/g, '').slice(0, 4);
  if (digits.length < 4) return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}
```
Run → PASS.

- [ ] **Step 2: Queries + store** (`src/features/schedule/queries.ts`): `listPatterns(courseId?)`, `listExceptions(courseId?)`, `upsertPattern(row)` (insert if no id else update), `removePattern`, `upsertException`, `removeException`. Store mirrors courses store shape with `patterns`, `exceptions`, `refresh()`.

- [ ] **Step 3: Components**

`WeekdayChips`: 7 Pressables, selected = ink bg + paper letter, unselected = paper + ink15 border.
`TimeField`: two `<TextInput>` (mono font, numeric `keyboardType="number-pad"`, maxLength 2/2) joined by `:`; onBlur → `normalizeTime`; parent validates with `isValidTime`.

- [ ] **Step 4: `app/schedule-edit.tsx` modal**

Route params: `courseId` (required), `patternId?` (edit mode). Content: WeekdayChips, start/end TimeField, location TextInput, VALID FROM/TO optional date fields (text `YYYY-MM-DD` validated with `isValidTime`-style regex `/^\d{4}-\d{2}-\d{2}$/`), SAVE (validates via `isValidTime`, end may be < start meaning crosses midnight — show hint "ends next day"), DELETE (edit mode, `Alert.alert` confirm).
Save → `upsertPattern` → `router.back()`.

- [ ] **Step 5: Course page SCHEDULE section**

Row per pattern: weekday letter, `09:00–10:30` in DSEG7, location in mono; tap row → `router.push('/schedule-edit?courseId=…&patternId=…')`; `+` header → new. Also show exceptions list (date, kind stamp `CANCELLED`/`EXTRA`).

- [ ] **Step 6: Gates + device**

Gates pass. Device: create M/W/F 09:00–10:30 class; edit to add location; delete one; verify persistence after reload.

- [ ] **Step 7: Commit**
```bash
git add -A
git commit -m "feat: schedule editor with patterns, exceptions, time fields"
```

---

### Task 10: Schedule selectors (Today data layer)

**Files:**
- Create: `src/features/schedule/selectors.ts`, `src/features/schedule/__tests__/selectors.test.ts`

**Interfaces:**
- Consumes: pattern/exception stores (Task 9), `occurrencesInRange` (Task 8).
- Produces (consumed by Tasks 11, 13, 14, 15, 17):
```ts
export interface ScheduleSlice { patterns: PatternInput[]; exceptions: ExceptionInput[]; }
export function todayOccurrences(slice: ScheduleSlice, nowMs: number): Occurrence[];
export function weekOccurrences(slice: ScheduleSlice, nowMs: number, weekStart: 'sunday'|'monday'): Occurrence[];
export function nextActiveOccurrence(slice: ScheduleSlice, nowMs: number): { current: Occurrence | null; next: Occurrence | null };
```

- [ ] **Step 1: Failing tests**

```ts
import { nextActiveOccurrence, todayOccurrences } from '../selectors';
// reuse DAY/at helpers from Task 8 tests
const slice = { patterns: [{ id: 'p1', courseId: 'c1', weekday: 1, startTime: '09:00', endTime: '10:30' }], exceptions: [] };

it('todayOccurrences returns only today rows', () => {
  expect(todayOccurrences(slice, new Date(2026, 8, 28, 8).getTime())).toHaveLength(1);
  expect(todayOccurrences(slice, new Date(2026, 8, 29, 8).getTime())).toHaveLength(0);
});

it('nextActiveOccurrence picks current when active', () => {
  const { current, next } = nextActiveOccurrence(slice, new Date(2026, 8, 28, 9, 30).getTime());
  expect(current?.id).toBe('p1:2026-09-28');
  expect(next).toBeNull();
});

it('nextActiveOccurrence picks next when between classes', () => {
  const { current, next } = nextActiveOccurrence(slice, new Date(2026, 8, 28, 7).getTime());
  expect(current).toBeNull();
  expect(next?.startMs).toBe(new Date(2026, 8, 28, 9).getTime());
});
```

- [ ] **Step 2: Run to verify failure** — then implement:

```ts
import { Occurrence, occurrencesInRange } from '@/lib/schedule';

export interface ScheduleSlice { patterns: PatternInput[]; exceptions: ExceptionInput[]; }
// (import PatternInput/ExceptionInput from '@/lib/schedule')

export function todayOccurrences(slice: ScheduleSlice, nowMs: number): Occurrence[] {
  const d = new Date(nowMs);
  const start = new Date(d); start.setHours(0, 0, 0, 0);
  const end = new Date(d); end.setHours(23, 59, 59, 999);
  return occurrencesInRange(slice.patterns, slice.exceptions, start.getTime(), end.getTime());
}

export function weekOccurrences(slice: ScheduleSlice, nowMs: number, weekStart: 'sunday' | 'monday'): Occurrence[] {
  const d = new Date(nowMs); d.setHours(0, 0, 0, 0);
  const offset = weekStart === 'monday' ? (d.getDay() + 6) % 7 : d.getDay();
  const start = new Date(d); start.setDate(d.getDate() - offset);
  const end = new Date(start); end.setDate(start.getDate() + 7);
  return occurrencesInRange(slice.patterns, slice.exceptions, start.getTime(), end.getTime());
}

export function nextActiveOccurrence(slice: ScheduleSlice, nowMs: number):
  { current: Occurrence | null; next: Occurrence | null } {
  const day = todayOccurrences(slice, nowMs);
  const current = day.find((o) => nowMs >= o.startMs && nowMs < o.endMs) ?? null;
  if (current) return { current, next: null };
  const upcoming = [...day, ...occurrencesInRange(slice.patterns, slice.exceptions, nowMs, nowMs + 7 * 86_400_000)]
    .filter((o) => o.startMs > nowMs)
    .sort((a, b) => a.startMs - b.startMs);
  return { current: null, next: upcoming[0] ?? null };
}
```
Import `PatternInput, ExceptionInput` alongside `Occurrence` from `@/lib/schedule`.

- [ ] **Step 3: Gates** — `npx jest src/features/schedule && npx tsc --noEmit && npx eslint .`

- [ ] **Step 4: Commit**
```bash
git add -A
git commit -m "feat: schedule selectors for today/week/next-class"
```

---

### Task 11: Today hero — dot-on-arc countdown + active tick bar

**Files:**
- Create: `src/lib/format/index.ts`, `src/lib/format/__tests__/format.test.ts`
- Create: `src/ui/DotArcClock.tsx`, `src/ui/tickbar.tsx`
- Create: `src/features/today/components/{HeroCard,PromiseBar}.tsx`
- Modify: `app/(tabs)/today.tsx`

**Interfaces:**
- Consumes: `nextActiveOccurrence` (Task 10), fonts/tokens (Tasks 1–2), `TMinusChip`.
- Produces:
  - `formatCountdown(ms: number): string` — `"12:34"` under an hour, `"2H 05M"` under a day, `">1D"` beyond; `formatClock(ms)` for `HH:MM:SS`.
  - `<DotArcClock totalMs, remainingMs, size?>` — SVG arc track (ink15) + progress arc (ink) + Doto digits in center + a filled dot riding the arc end.
  - `<TickBar progress: number /*0..1*/>` — animata port: row of 2px-wide, 12px-tall ticks; filled ticks ink, empty ink15; fill animates with per-tick staggered CSS transitions.
  - `<HeroCard /> — Today's hero: state = upcoming (countdown to next), active (countdown to end + TickBar), none (mascot-less empty: "NO CLASS").

- [ ] **Step 1: Failing format tests**

```ts
import { formatCountdown, formatClock } from '../format';
it('formats under an hour as MM:SS', () => { expect(formatCountdown(5 * 60_000 + 9_000)).toBe('05:09'); });
it('formats hours', () => { expect(formatCountdown(2 * 3600_000 + 5 * 60_000)).toBe('2H 05M'); });
it('formats days', () => { expect(formatCountdown(30 * 3600_000)).toBe('>1D'); });
it('formats clock HH:MM:SS', () => { expect(formatClock(3661_000)).toBe('01:01:01'); });
it('clamps negatives to zero', () => { expect(formatCountdown(-5)).toBe('00:00'); });
```
Run → FAIL → implement:
```ts
export function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00';
  if (ms >= 86_400_000) return '>1D';
  if (ms >= 3_600_000) {
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return `${h}H ${String(m).padStart(2, '0')}M`;
  }
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
export function formatClock(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(h)}:${p(m)}:${p(s)}`;
}
```
Run → PASS.

- [ ] **Step 2: `src/ui/tickbar.tsx` (animata tick bar port)**

```tsx
import { memo } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming, interpolateColors } from 'react-native-reanimated';
import { colors } from '@/ui/tokens';

const COUNT = 40;

function Tick({ index, progress }: { index: number; progress: number }) {
  // progress re-renders via prop; CSS-transition-free explicit animation keeps stagger exact
  const p = useSharedValue(0);
  const filled = index / COUNT < progress;
  const target = filled ? 1 : 0;
  if (p.value !== target) {
    p.value = withDelay(index * 6, withTiming(target, { duration: filled ? 75 : 200 }));
  }
  const style = useAnimatedStyle(() => ({
    backgroundColor: interpolateColors(p.value, [0, 1], [colors.ink15, colors.ink]),
    height: 4 + p.value * 8,
  }));
  return <Animated.View style={[{ width: 2, borderRadius: 1 }, style]} />;
}

export const TickBar = memo(function TickBar({ progress }: { progress: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 14 }}>
      {Array.from({ length: COUNT }, (_, i) => <Tick key={i} index={i} progress={progress} />)}
    </View>
  );
});
```
Note: mutating `p.value` during render is not valid React — move the `if` into `useEffect(() => { p.value = withDelay(...) }, [target])`. Use that corrected form in the final file (keep the delay/fill constants exact).

- [ ] **Step 3: `src/ui/DotArcClock.tsx`**

```tsx
import { View, Text } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, fontFamilies } from '@/ui/tokens';

interface Props { remainingMs: number; label: string; size?: number; }

export function DotArcClock({ remainingMs, label, size = 220 }: Props) {
  const r = size / 2 - 14;
  const cx = size / 2, cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const progress = 0.5; // replaced below by prop-derived: clamp(remaining/total) — total supplied via label context
  const angle = Math.PI * 1.5; // placeholder dot position; real dot: theta = -PI/2 + (1-progress)*2PI
  const dotX = cx + r * Math.cos(angle);
  const dotY = cy + r * Math.sin(angle);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} stroke={colors.ink15} strokeWidth={4} fill="none" />
        <Path
          d={`M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r}`}
          stroke={colors.ink} strokeWidth={4} fill="none"
          strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)}
        />
        <Circle cx={dotX} cy={dotY} r={7} fill={colors.ink} />
      </Svg>
      <Text style={{ position: 'absolute', fontFamily: fontFamilies.clock, fontWeight: '900', fontSize: 40, color: colors.ink }}>
        {label}
      </Text>
    </View>
  );
}
```
Correct before finishing: signature becomes `{ remainingMs, totalMs, label, size? }`, `progress = totalMs > 0 ? 1 - remainingMs / totalMs : 0` (arc depletes as time runs out — draw arc length = progress of REMAINING), dot angle `theta = -Math.PI / 2 + (1 - progress) * 2 * Math.PI` so the dot travels as the session runs, and the dash offset uses `1 - remainingRatio`. The skeleton above shows structure only; the math must implement: track circle full, filled arc = remaining fraction, dot at the boundary of the filled arc.

- [ ] **Step 4: `HeroCard` + Today screen wiring**

`src/features/today/components/HeroCard.tsx`:
- Pulls `useScheduleStore` + `useSettingsStore`; computes `nextActiveOccurrence(slice, nowMs)` with a 1 s `setInterval` tick (store `nowMs` in component state).
- Renders BrutCard containing: course emoji + label (mono), `DotArcClock` with `formatClock(remaining)` where remaining = `endMs - now` (active) or `startMs - now` (upcoming), state label (`ACTIVE` / `STARTS IN` stamp), and `TickBar` with `progress = (now - startMs) / (endMs - startMs)` only when active.
- Upcoming: also `TMinusChip` with `formatCountdown(startMs - now)`.
- No class today: `<EmptyState glyph="◷" label="no class today" />`.

`app/(tabs)/today.tsx` layout (top → bottom): header row (title `TODAY` in Orbitron + gear `SquareIconButton`), `HeroCard`, `PROMISES` section (Task 22 fills; render EmptyState now), `DUE` section (Task 17 fills; EmptyState now), `ATTENDANCE` weekly gauge (Task 15 fills; EmptyState now).

- [ ] **Step 5: Gates + device**

Gates pass. Device: schedule class 2 min from now → hero counts down live each second, flips to ACTIVE with ticking arc + tick bar, ends → next class or empty.

- [ ] **Step 6: Commit**
```bash
git add -A
git commit -m "feat: Today hero with dot-on-arc countdown and animata tick bar"
```

---

### Task 12: Reminders (pure planner + Expo notifications)

**Files:**
- Create: `src/lib/reminders/index.ts`, `src/lib/reminders/__tests__/planner.test.ts`
- Create: `src/features/reminders/notify.ts`

**Interfaces:**
- Consumes: `Occurrence` (Task 8), `events` (schema), settings `reminder_lead_default_min`.
- Produces:
```ts
export interface PlannedReminder { key: string; title: string; body: string; fireAtMs: number; }
export function planReminders(input: {
  occurrences: Occurrence[];
  events: { id: string; title: string; dueAtMs: number; done: boolean; leadMin: number | null; courseName?: string }[];
  nowMs: number;
  defaultLeadMin: number;
  horizonDays?: number; // default 14
}): PlannedReminder[];
```
Rules: occurrence reminder = `startMs - lead` (course override lead if set — passed in via occurrences? No: planner takes `leadByCourse: Record<string, number|null>` as input too); event reminder = `dueAtMs - (event.leadMin ?? defaultLeadMin)`; skip `fireAt <= now`; skip done events; dedupe by `key` (`class:${occurrence.id}`, `event:${id}`); cap at 64 items.
- RN side: `rescheduleAll(plan: PlannedReminder[])` → `cancelAllScheduledNotificationsAsync()` + schedule each with `{ type: DATE, date: new Date(fireAtMs), channelId: 'reminders' }`; `ensureChannel()`, `requestPermission()`; `catchUpIfMissed(scheduled)` fires `trigger: null` for any DATE trigger already in the past.

- [ ] **Step 1: Failing planner tests**

```ts
import { planReminders } from '../index';
const now = new Date(2026, 8, 25, 8).getTime();
const occ = { id: 'p1:2026-09-28', courseId: 'c1', dateId: '2026-09-28', startMs: new Date(2026, 8, 28, 9).getTime(), endMs: new Date(2026, 8, 28, 10).getTime(), patternId: 'p1', kind: 'pattern' as const };

it('plans class reminder at start minus lead', () => {
  const plan = planReminders({ occurrences: [occ], events: [], nowMs: now, defaultLeadMin: 60, leadByCourse: {} });
  expect(plan).toHaveLength(1);
  expect(plan[0]!.fireAtMs).toBe(occ.startMs - 3600_000);
  expect(plan[0]!.key).toBe('class:p1:2026-09-28');
});

it('course lead overrides default', () => {
  const plan = planReminders({ occurrences: [occ], events: [], nowMs: now, defaultLeadMin: 60, leadByCourse: { c1: 15 } });
  expect(plan[0]!.fireAtMs).toBe(occ.startMs - 900_000);
});

it('skips past fires and done events', () => {
  const pastOcc = { ...occ, startMs: now + 60_000, endMs: now + 120_000 }; // lead 60m => fire in past
  const plan = planReminders({
    occurrences: [pastOcc],
    events: [{ id: 'e1', title: 'Quiz', dueAtMs: now + 3600_000, done: true, leadMin: null }],
    nowMs: now, defaultLeadMin: 60, leadByCourse: {},
  });
  expect(plan).toHaveLength(0);
});

it('event lead overrides default', () => {
  const plan = planReminders({
    occurrences: [], events: [{ id: 'e1', title: 'Essay', dueAtMs: now + 7200_000, done: false, leadMin: 30 }],
    nowMs: now, defaultLeadMin: 60, leadByCourse: {},
  });
  expect(plan[0]!.fireAtMs).toBe(now + 7200_000 - 1800_000);
});
```
Note: add `leadByCourse: Record<string, number | null>` to the `input` interface above (first draft missed it).

- [ ] **Step 2: Run to verify failure** → implement planner in `src/lib/reminders/index.ts` per the Rules (pure, no RN imports) → tests PASS.

- [ ] **Step 3: `src/features/reminders/notify.ts`**

```ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { PlannedReminder } from '@/lib/reminders';

export async function ensureNotificationSetup(): Promise<boolean> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders', importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250], lightColor: '#FF231F7C', sound: null,
    });
  }
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

export async function rescheduleAll(plan: PlannedReminder[]): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const r of plan.slice(0, 64)) {
    await Notifications.scheduleNotificationAsync({
      content: { title: r.title, body: r.body, data: { key: r.key } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(r.fireAtMs), channelId: 'reminders' },
    });
  }
}

export async function catchUpMissed(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const now = Date.now();
  for (const s of scheduled) {
    const trigger = s.trigger as { type?: string; date?: number } | null;
    if (trigger?.type === 'date' && typeof trigger.date === 'number' && trigger.date < now) {
      await Notifications.scheduleNotificationAsync({ content: s.content, trigger: null });
      await Notifications.cancelScheduledNotificationAsync(s.identifier);
    }
  }
}
```

- [ ] **Step 4: Call sites**

Root layout after migrations: `ensureNotificationSetup(); catchUpMissed();` A `refreshReminders()` helper in `src/features/reminders/refresh.ts` gathers patterns/exceptions/events via queries, runs `occurrencesInRange` for the next 14 days + `planReminders` + `rescheduleAll` — called on app open and after schedule/event mutations (call from store `refresh`/create/update/remove paths of Tasks 9 and 16).

- [ ] **Step 5: Gates + device**

Gates pass. Device: set lead 1 min, schedule class in 3 min → notification arrives while app open AND after navigating away; kill app → notification still fires (scheduled at OS level).

- [ ] **Step 6: Commit**
```bash
git add -A
git commit -m "feat: reminder planner and local notification scheduling with catch-up"
```

---
### Task 13: Calendar month grid (flash-calendar restyled)

**Files:**
- Create: `src/features/calendar/theme.ts`, `src/features/calendar/__tests__/theme.test.ts`
- Create: `src/features/calendar/components/{MonthHeader,DotRow}.tsx`
- Modify: `app/(tabs)/calendar.tsx`

**Interfaces:**
- Consumes: `@marceloterreiro/flash-calendar` (`Calendar`, `toDateId`), settings `week_start`, tokens.
- Produces:
  - `paperTheme(selectedDateId): CalendarTheme` — paper palette, 16px rounded active cell (all four corners for single-day range), ink text, ink15 today outline.
  - `dayDotInfo(dateId, courses, occurrences, events): { classCount: number; hasAbsence: boolean; hasExam: boolean; }` (pure, used by Task 14 too)
  - Calendar screen: month grid + weekday header, selection state kept in screen; day cells render dots (Task 14 adds filters; Task 13 renders class dots only).

- [ ] **Step 1: Failing theme test**

```ts
import { paperTheme } from '../theme';
const theme = paperTheme('2026-09-28');
const base = theme.itemDay!.base!({} as never);
const active = theme.itemDay!.active!({ isStartOfRange: true, isEndOfRange: true } as never);

it('active cell is fully rounded single-day selection in ink', () => {
  expect(active.container!.backgroundColor).toBe('#141414');
  expect(active.container!.borderTopLeftRadius).toBe(16);
  expect(active.content!.color).toBe('#F4F1EA');
});
it('inactive base uses paper and rounded corners', () => {
  expect((base.container as never as { borderTopLeftRadius: number }).borderTopLeftRadius).toBe(16);
});
```
(If the theme callback parameter types require the full `CalendarDayMetadata` shape, cast through `as never` as shown and only assert on returned values.)

- [ ] **Step 2: Run to verify failure** → implement `src/features/calendar/theme.ts`:

```ts
import type { CalendarTheme } from '@marceloterreiro/flash-calendar';
import { colors } from '@/ui/tokens';

export function paperTheme(selectedId: string | null): CalendarTheme {
  return {
    itemDay: {
      base: () => ({ container: { backgroundColor: colors.paper } }),
      idle: () => ({ content: { color: colors.ink } }),
      today: () => ({
        container: { borderWidth: 1.5, borderColor: colors.ink },
        content: { color: colors.ink },
      }),
      active: () => ({
        container: {
          backgroundColor: colors.ink,
          borderTopLeftRadius: 16, borderBottomLeftRadius: 16,
          borderTopRightRadius: 16, borderBottomRightRadius: 16,
        },
        content: { color: colors.paper },
      }),
      disabled: () => ({ content: { color: colors.ink15 } }),
    },
    rowWeek: { container: { backgroundColor: colors.paper }, content: { color: colors.ink40 } },
    itemWeekName: { content: { color: colors.ink40, fontFamily: 'ShareTechMono', fontSize: 11 } },
    rowMonth: { container: { backgroundColor: colors.paper }, content: { color: colors.ink } },
  };
}
```
(The `selectedId` param is unused for v1 styling — keep the signature for later selection-morph refinements; remove the param instead if lint complains about unused.)

- [ ] **Step 3: Calendar screen**

```tsx
// app/(tabs)/calendar.tsx
import { useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { Calendar, toDateId } from '@marceloterreiro/flash-calendar';
import { paperTheme } from '@/features/calendar/theme';
import { colors, fontFamilies } from '@/ui/tokens';

export default function CalendarScreen() {
  const today = useMemo(() => toDateId(new Date()), []);
  const [selected, setSelected] = useState(today);
  const [monthId, setMonthId] = useState(today);
  const onDayPress = (id: string) => { setSelected(id); setMonthId(id); };
  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, padding: 16 }}>
      <Text style={{ fontFamily: fontFamilies.heading, fontSize: 18, color: colors.ink, marginBottom: 8 }}>CALENDAR</Text>
      <Calendar
        calendarMonthId={monthId}
        calendarFirstDayOfWeek={undefined as never} // set from settings: week_start==='monday'?'monday':'sunday'
        calendarActiveDateRanges={[{ startId: selected, endId: selected }]}
        onCalendarDayPress={onDayPress}
        theme={paperTheme(selected)}
      />
    </View>
  );
}
```
Wire `calendarFirstDayOfWeek` from `useSettingsStore().settings.week_start`. Memoize `onDayPress` with `useCallback` (flash-calendar perf requirement).

- [ ] **Step 4: Gates + device**

Gates pass. Device: grid renders paper monochrome, today outlined, tap day → ink pill selection, month matches settings week start.

- [ ] **Step 5: Commit**
```bash
git add -A
git commit -m "feat: calendar month grid with paper brutalist theme"
```

---

### Task 14: Day dots, filter chips, expanding day detail

**Files:**
- Create: `src/features/calendar/dots.ts`, `src/features/calendar/__tests__/dots.test.ts`
- Create: `src/features/calendar/components/DayDetail.tsx`
- Modify: `app/(tabs)/calendar.tsx`

**Interfaces:**
- Consumes: `occurrencesOnDay`, schedules/events stores, `FilterChip` (Task 4), `SegmentedChips`.
- Produces:
  - `dayDotInfo(dateId, occ, events, absences): { classCount, hasAbsence, hasExam, hasTask }` (pure)
  - Calendar header filter chips: `ALL · CLASSES · EXAMS · TASKS · CLUBS` with counts for selected day; active set filters which dots/detail rows show.
  - `<DayDetail dateId onClose onMarkAttendance>` — measure-morph expanding panel: pressing a day cell measures its frame (`useAnimatedRef` + `measure()` via `scheduleOnUI`) and animates the panel from that frame (spring from `{x,y,width,height}` to full-width sheet), showing occurrences + events rows for that date; attendance buttons live here (wired in Task 15).

- [ ] **Step 1: Failing dots test**

```ts
import { dayDotInfo } from '../dots';
const occ = [{ id: 'a', courseId: 'c1', dateId: '2026-09-28', startMs: 1, endMs: 2, patternId: 'p', kind: 'pattern' as const }];
it('counts classes and flags absence/exam/task', () => {
  const info = dayDotInfo('2026-09-28', occ,
    [{ id: 'e1', kind: 'test', done: false, dueAtMs: 1 }, { id: 'e2', kind: 'club', done: false, dueAtMs: 1 }],
    [{ date: '2026-09-28' }]);
  expect(info.classCount).toBe(1);
  expect(info.hasAbsence).toBe(true);
  expect(info.hasExam).toBe(true);
  expect(info.hasTask).toBe(false);
  expect(info.hasClub).toBe(true);
});
it('wrong date returns zeros', () => {
  expect(dayDotInfo('2026-09-29', occ, [], [])).toEqual({ classCount: 0, hasAbsence: false, hasExam: false, hasTask: false, hasClub: false });
});
```
Events input type: `{ id; kind: SchoolEvent['kind']; done: boolean; dueAtMs: number }`; exams = `kind` in `('test','quiz')`, tasks = `assignment` not done, clubs = `club`.

- [ ] **Step 2: Run FAIL → implement `dots.ts` → PASS.**

- [ ] **Step 3: Day cell children dots**

flash-calendar renders children inside the day Text. Customize via `Calendar.Item.Day` is not exposed at the `Calendar` root — instead render dots using the day-cell children mechanism: wrap the `Calendar` with custom `renderItem`? The root `Calendar` does not accept renderItem (only `Calendar.List` does).
Chosen approach (works with root `Calendar`): build the month grid from `Calendar.Row.Week` + `Calendar.Item.Day` yourself using `useCalendar({ calendarMonthId, calendarFirstDayOfWeek })` — full control of cell children (dot row under the number) while keeping flash-calendar's date math:

```tsx
import { Calendar, useCalendar, toDateId } from '@marceloterreiro/flash-calendar';

const { weeksList } = useCalendar({ calendarMonthId: monthId, calendarFirstDayOfWeek: weekStart });
// render header row from weekDaysList, then:
{weeksList.map((week, wi) => (
  <Calendar.Row.Week key={wi}>
    {week.map((day) => (
      <Calendar.Item.Day
        key={day.dateId}
        dateId={day.dateId}
        isSelectable={!day.isOutsideFixedMonth}   // prop name from package types
        onPress={onDayPress}
        state={day.dateId === selected ? 'active' : day.dateId === todayId ? 'today' : 'idle'}
        metadata={day}
      >
        {Number(day.displayLabel?.text ?? day.dayNumber)}
        {/* dots */}
      </Calendar.Item.Day>
    ))}
  </Calendar.Row.Week>
))}
```
IMPORTANT for the implementer: read `node_modules/@marceloterreiro/flash-calendar/src/components/...` (or `.d.ts`) for exact `Calendar.Item.Day` props (`onPress` vs `onDayPress`, `state` values, metadata type) — the API surface above is the intended shape; match the installed types exactly, and keep the theme object applied by passing `theme={paperTheme(selected)}` where the API allows it. Dots row inside each cell: small `View` (3px circles: ink for class, danger for absence, red-strike for exam) rendered under the number.

- [ ] **Step 4: Filter chips + DayDetail measure-morph**

Header chips (horizontal ScrollView): ALL / CLASSES / EXAMS / TASKS / CLUBS with `dayDotInfo` counts; multi-select toggles (ALL resets).
`DayDetail`: rendered as absolutely-positioned Animated.View over the screen; on day press: `scheduleOnUI(() => { const m = measure(cellRef); ... })` animating `translateX/Y/width/height` from cell frame to `{x: 16, y: measuredTop, width: screenWidth - 32, height: 380}` with `withSpring`; close button + backdrop `Pressable`. Rows: time (DSEG7) + course emoji + title; sections follow active filters.

- [ ] **Step 5: Gates + device**

Gates pass. Device: dots show for scheduled days; filters toggle; tapping a day morphs panel from the cell; back/close returns without glitch; scrolling the grid stays ≥55fps (no stutter on swipe months).

- [ ] **Step 6: Commit**
```bash
git add -A
git commit -m "feat: calendar dots, filters, measure-morph day detail"
```

---

### Task 15: Attendance marking + stats + weekly gauge

**Files:**
- Create: `src/features/attendance/logic.ts`, `src/features/attendance/__tests__/logic.test.ts`
- Create: `src/features/attendance/queries.ts`
- Create: `src/features/attendance/components/{AttendanceButtons,WeekGauge}.tsx`
- Modify: `src/features/calendar/components/DayDetail.tsx`, `app/course/[id].tsx` (ATTENDANCE section), `app/(tabs)/today.tsx` (gauge slot)

**Interfaces:**
- Consumes: schema `attendance`; `todayOccurrences`.
- Produces (pure):
```ts
export interface AttendanceStat { present: number; absent: number; late: number; excused: number; rate: number; /*0..1*/ }
export function attendanceStats(rows: { status: 'present'|'absent'|'late'|'excused' }[]): AttendanceStat;
export function weekProgress(sessionsThisWeek: number, attended: number): number; // 0..1
```
Rules: `rate = (present + late + excused) / total` (only present/absent/late/excused rows count; empty → rate 0). `weekProgress = total === 0 ? 0 : attended / total`.
- RN: `upsertAttendance(courseId, date, status)` (ON CONFLICT upsert by unique index), `listAttendance(courseId)`, `listWeekAttendance(mondayDate)`. `AttendanceButtons` — 4 square icon buttons `✓ / ✗ / ~ / ◌` (present/absent/late/excused) with ink/danger active states, shown per session row in DayDetail. `WeekGauge` — `TickBar` reused with `weekProgress`.

- [ ] **Step 1: Failing logic tests**

```ts
import { attendanceStats, weekProgress } from '../logic';
it('computes rate counting late+excused as attended', () => {
  const s = attendanceStats([{ status: 'present' }, { status: 'present' }, { status: 'absent' }, { status: 'late' }, { status: 'excused' }]);
  expect(s).toEqual({ present: 2, absent: 1, late: 1, excused: 1, rate: 4 / 5 });
});
it('empty stats → rate 0', () => {
  expect(attendanceStats([]).rate).toBe(0);
});
it('week progress guards zero total', () => {
  expect(weekProgress(0, 0)).toBe(0);
  expect(weekProgress(4, 3)).toBe(0.75);
});
```
Run FAIL → implement → PASS.

- [ ] **Step 2: Queries** — `upsertAttendance` using drizzle `.onConflictDoUpdate({ target: [attendance.courseId, attendance.date], set: { status, note, updatedAt: new Date() } })`; selects via `eq(attendance.courseId, …)`.

- [ ] **Step 3: UI wiring**

- DayDetail session rows get `AttendanceButtons`; picking a status upserts + `Haptics.selectionAsync()` + re-renders (row shows chosen status as stamp `ABSENT` in danger / `OK` in ink).
- Course page ATTENDANCE section: stat row (DSEG7 numbers: P/A/L/E + rate as `%`), list of recent marks with status stamps, `EmptyState glyph="◌" label="not marked yet"`.
- Today `ATTENDANCE` slot: `WeekGauge` (`sessionsThisWeek`, `attended` from week occurrences × attendance rows) + `formatClock`-style label `3/4`.

- [ ] **Step 4: Gates + device**

Gates pass. Device: mark absent on yesterday → red mark on calendar dot (`hasAbsence` shows), course stats update, weekly gauge on Today reflects.

- [ ] **Step 5: Commit**
```bash
git add -A
git commit -m "feat: attendance marking, stats, weekly gauge"
```

---

### Task 16: Events CRUD + T-minus tickets

**Files:**
- Create: `src/features/events/logic.ts`, `src/features/events/__tests__/logic.test.ts`
- Create: `src/features/events/queries.ts`, `src/features/events/store.ts`
- Create: `src/features/events/components/{EventForm,TicketCard,KindChip}.tsx`
- Modify: `app/event/[id].tsx` (modal), `app/(tabs)/calendar.tsx` (event `+` entry)

**Interfaces:**
- Consumes: schema `events`; `TMinusChip`, `Stamp`, `BrutCard`.
- Produces (pure):
```ts
export type EventKind = 'assignment' | 'test' | 'quiz' | 'club' | 'meeting' | 'other';
export function validateEvent(input: { title?: string; dueAtMs?: number; kind?: EventKind }): { ok: boolean; error?: string };
export function tMinusLabel(dueAtMs: number, nowMs: number): string; // "T-6D", "T-14H", "TODAY", "OVERDUE"
```
Rules: `tMinusLabel`: >7d → `T-<N>D` (ceil days); 7d≥x>1d → `T-<N>D`; 1d≥x>1h → `T-<N>H`; 1h≥x>0 → `T-<N>M`; x≤0 → `OVERDUE` (danger); same calendar day & future → `TODAY`.
- RN: store `useEventsStore` (list by date range, toggle done, CRUD); `EventForm` modal: KindChip row (6 kinds with glyphs `📝 assignment, 📝 test... glyphs: assignment 📋, test 📝, quiz ❓, club ⚑, meeting ◎, other •`), title input, description input (multiline), course picker (chips of courses + NONE), due date+time (TimeField + `YYYY-MM-DD` field), lead override chips (15/60/1440/null), SAVE/DELETE.
- `TicketCard({ event, nowMs })` — BrutCard with `TMinusChip tMinusLabel(...)`, title, one-line description (`numberOfLines={2}`), course emoji chip, done checkbox (`Stamp text="DONE"` when done, tap toggles).

- [ ] **Step 1: Failing logic tests**

```ts
import { tMinusLabel, validateEvent } from '../logic';
const now = new Date(2026, 8, 25, 8).getTime();
it('labels ranges', () => {
  expect(tMinusLabel(now + 6 * 86_400_000, now)).toBe('T-6D');
  expect(tMinusLabel(now + 5 * 3600_000, now)).toBe('T-5H');
  expect(tMinusLabel(now + 30 * 60_000, now)).toBe('T-30M');
  expect(tMinusLabel(now - 1000, now)).toBe('OVERDUE');
  expect(tMinusLabel(now + 90 * 60_000, now)).toBe('T-2H');
});
it('validates title and due', () => {
  expect(validateEvent({ title: 'Essay', dueAtMs: now }).ok).toBe(true);
  expect(validateEvent({ title: '', dueAtMs: now }).ok).toBe(false);
  expect(validateEvent({ title: 'Essay' }).ok).toBe(false);
  expect(validateEvent({ title: 'Essay', dueAtMs: now, kind: 'bogus' as never }).ok).toBe(false);
});
```
Note `T-2H` case: 90 min = ceil to 2h? Rule: 1d≥x>1h → hours = **ceil**. `Math.ceil(90/60)=2` ✓. Days also ceil.

Run FAIL → implement → PASS.

- [ ] **Step 2: queries/store** — `listEventsInRange(startMs, endMs)` (where `dueAt >= start AND dueAt <= end`), `insertEvent`, `patchEvent`, `removeEvent`, `toggleDone`. Store exposes `eventsForDate(dateId): SchoolEvent[]`.

- [ ] **Step 3: EventForm + TicketCard + wiring**

- `app/event/[id].tsx` handles `id='new'` (params `dueAt?`, `courseId?`) and edit.
- Calendar header gets second `SquareIconButton glyph="◆"` → `router.push('/event/[id]')` with default due = selected date.
- Task 17 consumes `TicketCard`.

- [ ] **Step 4: Gates + device** — create exam 6 days out + description; card shows `T-6D` + description line; toggle done → stamp; overdue shows red chip.

- [ ] **Step 5: Commit**
```bash
git add -A
git commit -m "feat: events CRUD with kinds, T-minus ticket cards"
```

---

### Task 17: Event integration (agenda, Today DUE, reminders wiring)

**Files:**
- Create: `src/features/events/components/AgendaList.tsx`
- Modify: `app/(tabs)/today.tsx` (DUE section), `DayDetail.tsx` (event rows), `src/features/reminders/refresh.ts` (include events)

**Interfaces:**
- Consumes: `TicketCard`, `useEventsStore`, `planReminders`.
- Produces: `AgendaList({ dateId? , dayOffset? })` — sorted list of `TicketCard`s (events for a date, or next 7 days); Today DUE section shows next 3 non-done events; DayDetail rows interleave events with sessions (events sorted by dueAt).

- [ ] **Step 1: Wire reminders refresh**

`refreshReminders()` in `src/features/reminders/refresh.ts` adds events: gather `listEventsInRange(now, now + 14d)` non-done → map to planner input (`leadMin: remindLeadOverrideMin`, `dueAtMs`) → single `planReminders` call with occurrences + events → `rescheduleAll`. Call `refreshReminders()` after event create/update/toggle/remove.

- [ ] **Step 2: Today DUE section**

```tsx
const due = useEventsStore((s) => s.upcoming(3)); // next 3 non-done sorted by dueAt
// render: <TicketCard event={e} nowMs={nowMs} /> x3, else EmptyState glyph="◆" label="nothing due"
```
`upcoming(limit)` selector implemented in the store via `events` array sort/filter.

- [ ] **Step 3: DayDetail events + AgendaList in day panel**

Events matching `dateId` (compare `toDateId(new Date(e.dueAtMs))`) render after session rows with `TMinusChip`.

- [ ] **Step 4: Gates + device**

Gates pass. Device: create exam → appears in Today DUE with `T-6D`, in day detail, notification scheduled; complete it → stamp + drops from upcoming after refresh.

- [ ] **Step 5: Commit**
```bash
git add -A
git commit -m "feat: event agenda integration on Today and day detail with reminders"
```

---
### Task 18: GPA engine (pure)

**Files:**
- Create: `src/lib/gpa/index.ts`, `src/lib/gpa/__tests__/engine.test.ts`

**Interfaces:**
- Consumes: nothing (pure).
- Produces (consumed by Tasks 19, 20):
```ts
export interface ScaleRow { letter: string; minPct: number; points: number }
export interface Scale { id: string; name: string; rows: ScaleRow[] }   // rows sorted by minPct desc
export interface CourseInput { id: string; credits: number; finalPct: number | null; excluded: boolean }
export interface GradeRow { score: number; maxScore: number; weightOverride: number | null }

export function validateScale(rows: ScaleRow[]): { ok: boolean; errors: string[] };
export function sortScaleRows(rows: ScaleRow[]): ScaleRow[];
export function courseFinalPct(grades: GradeRow[]): number | null;   // null when no grades
export function pointsForPct(pct: number, scale: Scale): number;     // interpolate between bounds; below lowest min → points of lowest row (or 0 if minPct>0 floor?)
export function computeGpa(courses: CourseInput[], scale: Scale, rounding: number): { gpa: number | null; totalCredits: number; includedCount: number };
export function targetGpaNeeded(courses: CourseInput[], scale: Scale, target: number): number | null; // avg points needed on remaining (finalPct===null) credits
export function neededOnFinal(input: { currentPct: number; finalWeight: number; targetPct: number }): { neededPct: number; band: 'safe' | 'borderline' | 'impossible' };
```
Rules (from spec):
- `validateScale`: errors for empty rows, duplicate letters, non-increasing `minPct` (rows must be strictly descending after sort), **gaps** between adjacent `minPct` bounds (next row's min must equal previous min exactly? No — gaps allowed only if next.minPct === prev.minPct is overlap; a gap = prev row occupies [min, next.min) naturally... ). Concrete rule: after sorting desc by minPct, require rows[i].minPct > rows[i+1].minPct (strict, catches duplicates/overlaps) and rows[last].minPct === 0 is NOT required but warn-free. Gap between bounds doesn't exist in this model because ranges are [min, +inf) chains — so the ONLY errors: empty, duplicate letters (case-insensitive), non-strict-descending minPct, negative points, minPct outside 0–100.
- `courseFinalPct`: weighted by each grade's `weightOverride ?? 1` proportion: `Σ(score/maxScore * w) / Σ(w)` × 100; empty → null; `maxScore === 0` grades skipped.
- `pointsForPct`: find first row (desc) with `minPct <= pct`; interpolate linearly between this row and the next-lower row: `points = row.points + (pct - row.minPct) / (next.minPct - row.minPct) * (next.points - row.points)` when a next row exists and bounds differ, else `row.points`; below all rows → `last.points` clamped ≥ 0; pct ≥ top min → top points.
- `computeGpa`: include courses where `!excluded && finalPct !== null && credits > 0`; `gpa = Σ(points * credits) / Σ(credits)`; round with `rounding` decimals (0–3); no included → `{ gpa: null, totalCredits: 0, includedCount: 0 }`.
- `targetGpaNeeded`: remaining = courses with `finalPct === null && !excluded && credits > 0`; done = included with pct; if no remaining → null; `needed = (target * (doneCredits + remCredits) - Σ(points*credits)_done) / remCredits` (points-space average).
- `neededOnFinal`: `current = (currentPct * (1 - finalWeight) + needed * finalWeight)` → `needed = (targetPct - currentPct * (1 - finalWeight)) / finalWeight`; band: `needed <= 70 → safe`, `70 < needed <= 100 → borderline`, `> 100 → impossible`; `finalWeight` must be in (0, 1] — invalid → needed NaN guard returns `impossible` with neededPct 0? No: throw-free — return `{ neededPct: 0, band: 'impossible' }` only when weight ≤ 0.

- [ ] **Step 1: Failing tests (core of the task)**

```ts
import {
  computeGpa, courseFinalPct, neededOnFinal, pointsForPct, targetGpaNeeded, validateScale,
} from '../index';

const scale = { id: 's', name: '4.0', rows: [
  { letter: 'A', minPct: 90, points: 4 },
  { letter: 'B', minPct: 80, points: 3 },
  { letter: 'C', minPct: 70, points: 2 },
  { letter: 'D', minPct: 60, points: 1 },
  { letter: 'F', minPct: 0, points: 0 },
] };

it('validateScale catches duplicates, order, bounds', () => {
  expect(validateScale(scale.rows).ok).toBe(true);
  expect(validateScale([...scale.rows, { letter: 'A', minPct: 50, points: 3.5 }]).ok).toBe(false); // dup letter
  expect(validateScale([{ letter: 'A', minPct: 90, points: 4 }, { letter: 'B', minPct: 95, points: 3 }]).ok).toBe(false); // not descending
  expect(validateScale([]).ok).toBe(false);
  expect(validateScale([{ letter: 'A', minPct: 101, points: 4 }]).ok).toBe(false);
});

it('courseFinalPct weights by override and ignores empty', () => {
  expect(courseFinalPct([{ score: 8, maxScore: 10, weightOverride: null }, { score: 18, maxScore: 20, weightOverride: null }])).toBeCloseTo(90);
  expect(courseFinalPct([{ score: 50, maxScore: 100, weightOverride: 3 }, { score: 90, maxScore: 100, weightOverride: 1 }])).toBeCloseTo(60);
  expect(courseFinalPct([])).toBeNull();
});

it('pointsForPct interpolates between bounds', () => {
  expect(pointsForPct(95, scale)).toBeCloseTo(4);
  expect(pointsForPct(85, scale)).toBeCloseTo(3.5);
  expect(pointsForPct(5, scale)).toBeCloseTo(0.5);
  expect(pointsForPct(45, scale)).toBeCloseTo(0.5);
  expect(pointsForPct(0, scale)).toBeCloseTo(0);
});

it('computeGpa credit-weights and excludes', () => {
  const r = computeGpa([
    { id: '1', credits: 3, finalPct: 95, excluded: false },
    { id: '2', credits: 4, finalPct: 85, excluded: false },
    { id: '3', credits: 5, finalPct: 70, excluded: true },
  ], scale, 2);
  expect(r.gpa).toBeCloseTo(3.54, 2); // (4*3 + 3.5*4) / 7
  expect(r.totalCredits).toBe(7);
  expect(r.includedCount).toBe(2);
});

it('computeGpa empty → null', () => {
  expect(computeGpa([], scale, 2).gpa).toBeNull();
});

it('targetGpaNeeded solves remaining credits', () => {
  const needed = targetGpaNeeded([
    { id: '1', credits: 4, finalPct: 95, excluded: false }, // points 4.0 → 16
    { id: '2', credits: 4, finalPct: null, excluded: false },
  ], scale, 3.5);
  // (3.5*8 - 16) / 4 = 3.0
  expect(needed).toBeCloseTo(3);
});

it('neededOnFinal bands', () => {
  expect(neededOnFinal({ currentPct: 85, finalWeight: 0.3, targetPct: 80 })).toEqual({ neededPct: 68.33, band: 'safe' });
  expect(neededOnFinal({ currentPct: 85, finalWeight: 0.3, targetPct: 95 }).band).toBe('impossible'); // 118.3
  expect(neededOnFinal({ currentPct: 88, finalWeight: 0.5, targetPct: 94 })).toEqual({ neededPct: 100, band: 'borderline' });
});
```
Adjust exact `toEqual` values to `toBeCloseTo` per-field where rounding differs (use `const r = neededOnFinal(...); expect(r.neededPct).toBeCloseTo(68.33, 2); expect(r.band).toBe('safe');`) — but keep bands and formulas as specified.

- [ ] **Step 2: Run to verify failure** — `npx jest src/lib/gpa` → FAIL.

- [ ] **Step 3: Implement `src/lib/gpa/index.ts` per the Rules block** (pure; no imports outside this file).

- [ ] **Step 4: Tests pass + gates** — `npx jest src/lib/gpa && npx tsc --noEmit && npx eslint .`

- [ ] **Step 5: Commit**
```bash
git add -A
git commit -m "feat: pure GPA engine — scales, interpolation, solvers, bands"
```

---

### Task 19: Grades + categories CRUD with course final %

**Files:**
- Create: `src/features/grades/queries.ts`, `src/features/grades/store.ts`
- Create: `src/features/grades/components/{GradeRow as GradeListItem,GradeForm,CategoryChips,ScoreBar}.tsx`
- Modify: `app/course/[id].tsx` (GRADES section)

**Interfaces:**
- Consumes: `courseFinalPct` (Task 18), schema `grades`/`gradeCategories`.
- Produces:
  - `useGrades(courseId)`: `{ categories, grades, finalPct, addGrade, updateGrade, removeGrade, addCategory, removeCategory }`
  - Course GRADES section: final % big DSEG7 number + `ScoreBar` (horizontal ink fill bar), category chips (weights shown `HW 40%`), grade list rows (title, `18/20` in DSEG7, weight override badge `×3` if set), `+` → GradeForm modal, long-press row → delete (Alert).
  - `GradeForm`: title, score, maxScore (default 100), date (`YYYY-MM-DD`), category chips incl. `NONE`, weight override stepper (nullable), note.

- [ ] **Step 1: Validation logic test (pure)**

`src/features/grades/__tests__/logic.test.ts`:
```ts
import { validateGrade } from '../logic';
it('accepts score ≤ max, rejects zero max', () => {
  expect(validateGrade({ title: 'Mid', score: 18, maxScore: 20 }).ok).toBe(true);
  expect(validateGrade({ title: 'Mid', score: 25, maxScore: 20 }).ok).toBe(false);
  expect(validateGrade({ title: 'Mid', score: 5, maxScore: 0 }).ok).toBe(false);
  expect(validateGrade({ title: '', score: 5, maxScore: 10 }).ok).toBe(false);
});
```
Run FAIL → implement `validateGrade` → PASS.

- [ ] **Step 2: Queries/store** — drizzle insert/patch/delete for `grades` and `gradeCategories`; store computes `finalPct = courseFinalPct(grades.map(...))` derived on every change.

- [ ] **Step 3: UI** — GRADES section in course page per Interfaces; tapping final % shows a BrutCard detail popover? No — keep flat: final % + ScoreBar always visible. Add category weights sum display: if Σ(weights) ≠ 100, show `Stamp text="WEIGHTS ≠100"` in danger (informational only — engine doesn't require 100).

- [ ] **Step 4: Gates + device** — add two grades → final % matches manual math; delete updates; category weight stamp appears/disappears.

- [ ] **Step 5: Commit**
```bash
git add -A
git commit -m "feat: grades and categories with computed course final percent"
```

---

### Task 20: GPA screen (gauge) + scale editor

**Files:**
- Create: `src/ui/ArcGauge.tsx`
- Create: `src/features/gpa/components/{GpaResultCard,GpaForm,ScaleEditor}.tsx`
- Create: `src/features/gpa/store.ts`
- Modify: `app/(tabs)/gpa.tsx`, `app/settings.tsx` (GPA section)

**Interfaces:**
- Consumes: engine (Task 18), grades/courses stores, `SegmentedChips`, `FilterChip`, `TMinusChip`, tokens.
- Produces:
  - `<ArcGauge value: number max: number label: string size?>` — SVG arc (track ink15, fill ink), big Doto number centered, mono caption. (Different from DotArcClock: gauge shows a ratio value, no traveling dot.)
  - GPA screen: **sticky top** `GpaResultCard` (SegmentedChips `TERM | CUMULATIVE`, ArcGauge of GPA 0..4 (max = scale top points), stat row: `CREDITS 21` `SCALE 4.0` `ROUND 2` in DSEG7) + scrolling `GpaForm`: scale selector chips (from `gpa_scales` + `USE DEFAULT`), rounding stepper 0–3, per-course rows (emoji + name + final % + exclude toggle chip), TARGET chips A/B/C/PASS → shows `targetGpaNeeded` result in a BrutCard (`NEED 3.20`), FINAL input (course select + current % + final weight slider 10–100% + target % stepper) → `neededOnFinal` result card with band: `safe` = ink stamp `SAFE`, `borderline` = stamp `BORDERLINE`, `impossible` = danger stamp `IMPOSSIBLE` + `neededPct` clamped display `>100`.
  - Settings GPA section: `ScaleEditor` — rows list (letter, min%, points) with add/remove (min 2 rows), validation errors from `validateScale` shown inline in danger mono; SAVE disabled while invalid; sets `gpa_scale_id`.
  - Term selector: chips of `terms` (or all courses if no terms).

- [ ] **Step 1: ArcGauge component test (render)**

```tsx
import renderer from 'react-test-renderer';
import { ArcGauge } from '../ArcGauge';
it('renders value label', () => {
  const t = renderer.create(<ArcGauge value={3.5} max={4} label="GPA" />);
  expect(JSON.stringify(t.toJSON())).toContain('3.5');
});
```

- [ ] **Step 2: Build ArcGauge** — SVG: `Circle` track + `Path` arc with `strokeDasharray` proportional to `value/max`; center `<Text>` Doto 44px showing `value.toFixed(rounding)`; caption mono `label`.

- [ ] **Step 3: `src/features/gpa/store.ts`**

State: `activeScaleId`, `excluded: string[]` (syncs `settings.gpa_excluded`), `rounding` (syncs `gpa_rounding`), `mode: 'term'|'cumulative'`, `selectedTermId`, plus derived selector `useGpaResult()` that pulls courses + grades (via courses/grades stores), computes `finalPct` per course, filters by term when `mode==='term'`, runs `computeGpa`.

- [ ] **Step 4: GPA screen + form** per Interfaces; wire target chips and final solver with local component state (input values).

- [ ] **Step 5: Scale editor in settings** — rows editable via TextInputs (`letter` text, `minPct`/`points` numeric), live `validateScale` errors, SAVE → insert/update `gpa_scales` + `settings.gpa_scale_id` + `refreshReminders` not needed.

- [ ] **Step 6: Gates + device**

Gates pass. Device: add grades → GPA gauge moves; exclude a course → recalculates; change rounding → decimals change; scale editor rejects overlapping bounds with visible error; target chip shows needed average.

- [ ] **Step 7: Commit**
```bash
git add -A
git commit -m "feat: GPA gauge screen with compact form and scale editor"
```

---
### Task 21: Study timer (dot-on-arc countdown + sessions)

**Files:**
- Create: `src/lib/timer/logic.ts`, `src/lib/timer/__tests__/logic.test.ts`
- Create: `src/features/timer/store.ts`, `src/features/timer/queries.ts`
- Create: `src/features/timer/components/{TimerFace,SubjectPicker,SessionHistory}.tsx`
- Modify: `app/(tabs)/timer.tsx`

**Interfaces:**
- Consumes: `DotArcClock`, courses store, `Haptics`.
- Produces (pure):
```ts
export type TimerStatus = 'idle' | 'running' | 'paused';
export interface TimerState { status: TimerStatus; courseId: string | null; startedAtMs: number | null; remainingMs: number; targetMs: number; }
export function elapsedMs(state: TimerState, nowMs: number): number;   // running: (now-startedAt) + accumulated; paused/idle: accumulated
export function tick(state: TimerState, nowMs: number): TimerState;    // returns state with remainingMs updated (running only)
export function finished(state: TimerState, nowMs: number): boolean;
export function progressOf(state: TimerState): number;                 // 0..1 elapsed/target
```
Store rules: `start(courseId, targetMs)` sets running with `startedAtMs = now`; `pause()` freezes accumulated = target - remaining; `resume()` re-stamps `startedAtMs`; `reset()` → idle with remaining = target; on `finished` → persist `study_sessions` row (`durationMin = Math.round(targetMs/60000)`) via `Haptics.notificationAsync(Success)` + mascot moment (Task 22), status → idle.
- Screen: `TimerFace` = `DotArcClock` + `formatCountdown(remaining)`; duration chips `25/45/60/90 MIN` (DSEG7); `SubjectPicker` = horizontal course emoji chips + `NONE`; controls: `▶` start / `⏸` pause / `↻` reset / `■` finish (square hard-shadow buttons); `SessionHistory` = last 10 sessions (course emoji + `45M` DSEG7 + date mono).

- [ ] **Step 1: Failing pure tests**

```ts
import { elapsedMs, finished, progressOf, tick } from '../logic';
const base = { status: 'running' as const, courseId: null, startedAtMs: 1000, remainingMs: 60_000, targetMs: 60_000 };
it('running elapsed grows with now', () => {
  expect(elapsedMs(base, 1000)).toBe(0);
  expect(elapsedMs({ ...base, remainingMs: 45_000 }, 16_000)).toBe(15_000);
});
it('tick reduces remaining', () => {
  const s = tick(base, 16_000);
  expect(s.remainingMs).toBe(45_000);
  expect(s.startedAtMs).toBe(16_000); // re-anchors so drift doesn't accumulate
});
it('finished at zero', () => {
  expect(finished({ ...base, remainingMs: 0 }, 61_000)).toBe(true);
  expect(finished(base, 1000)).toBe(false);
});
it('progress clamps', () => {
  expect(progressOf(base)).toBe(0);
  expect(progressOf({ ...base, remainingMs: 30_000 })).toBeCloseTo(0.5);
  expect(progressOf({ ...base, remainingMs: 0, startedAtMs: null, status: 'idle' as const })).toBe(1);
});
```
Run FAIL → implement `src/lib/timer/logic.ts` (remaining computed as `max(0, remainingAtAnchor - (now - startedAtMs))` where anchor stored in state; for `paused`/`idle`, `remainingMs` is authoritative) → PASS.

- [ ] **Step 2: Store + queries** — zustand store with `state`, `nowMs` updated by a 1 s interval inside `app/(tabs)/timer.tsx` (subscribe in effect, call `tick`); `queries.ts`: `insertSession(courseId, startedAtMs, durationMin)`, `listSessions(limit)`.

- [ ] **Step 3: UI** — Timer screen: TimerFace, chips, picker, controls; running state disables subject change; finished flow persists + resets.

- [ ] **Step 4: Gates + device** — start 1-min timer → arc depletes, count reaches 0, haptic + row appears in history; pause/resume keeps accuracy (drift < 1s over 30s).

- [ ] **Step 5: Commit**
```bash
git add -A
git commit -m "feat: study timer with arc countdown and session logging"
```

---

### Task 22: Study promises + mascot moment

**Files:**
- Create: `src/lib/promises/logic.ts`, `src/lib/promises/__tests__/logic.test.ts`
- Create: `src/features/today/components/PromiseBar.tsx` (promise row w/ TickBar)
- Create: `src/features/timer/components/Mascot.tsx`
- Modify: `app/(tabs)/today.tsx` (PROMISES section), `app/(tabs)/timer.tsx` (promise CRUD + mascot overlay)

**Interfaces:**
- Consumes: `TickBar` (Task 11), `studySessions`/`studyPromises` tables, `toDateId`.
- Produces (pure):
```ts
export interface PromiseInput { id: string; courseId: string | null; subject: string; targetMin: number; period: 'day' | 'week'; }
export function promiseProgress(p: PromiseInput, sessions: { startedAtMs: number; durationMin: number }[], nowMs: number, weekStart: 'sunday'|'monday'): { doneMin: number; targetMin: number; ratio: number }; // ratio capped 1
```
Window rules: `day` → sessions with `startedAtMs` in local today; `week` → since last weekStart boundary; only sessions matching `courseId` (or all subjects if `courseId === null`).
- RN: PROMISES section lists promises: subject + emoji + `doneM/TGT` DSEG7 + `TickBar ratio`; `+` opens inline add (subject text, target stepper 15–240, period chips, course chips). Mascot: `Mascot` = inline SVG (two paths: body+beak, alternate eyes frame) with 2-frame blink (swap every 3s, `useSharedValue` opacity), overlay on timer completion (`Stamp text="DONE"` beside), size 64.

- [ ] **Step 1: Failing progress tests**

```ts
import { promiseProgress } from '../logic';
const mon = new Date(2026, 8, 28).getTime(); // Monday
const p = { id: 'x', courseId: 'c1', subject: 'Maths', targetMin: 60, period: 'week' as const };
it('sums sessions inside current week window', () => {
  const r = promiseProgress(p, [
    { startedAtMs: mon + 3600_000, durationMin: 30 },
    { startedAtMs: mon - 7 * 86_400_000, durationMin: 45 }, // previous week — excluded
    { startedAtMs: mon + 7200_000, durationMin: 60 },
  ], mon + 86_400_000, 'monday');
  expect(r.doneMin).toBe(90);
  expect(r.ratio).toBe(1); // capped
});
it('filters by course when set', () => {
  const r = promiseProgress(p, [{ startedAtMs: mon + 1000, durationMin: 45, }], mon + 2000, 'monday');
  expect(r.doneMin).toBe(45);
  const none = promiseProgress({ ...p, courseId: 'other' }, [{ startedAtMs: mon + 1000, durationMin: 45 }], mon + 2000, 'monday');
  expect(none.doneMin).toBe(0);
});
```
Session type in this module carries optional `courseId`; add it to the `sessions` param type.

Run FAIL → implement per window rules → PASS.

- [ ] **Step 2: PromiseBar + Today wiring** — PROMISES section: `EmptyState glyph="◔" label="no promises — set one"` when empty.

- [ ] **Step 3: Mascot + timer completion** — completion overlay: `<View>` with Mascot blink loop + `Stamp text="DONE"` + session duration; auto-dismiss after 4 s or on tap.

- [ ] **Step 4: Gates + device** — create promise 30m/day; run 5-min timer session → promise bar ticks up; mascot blinks on completion.

- [ ] **Step 5: Commit**
```bash
git add -A
git commit -m "feat: study promises with tick-bar progress and mascot moment"
```

---

### Task 23: File vault

**Files:**
- Create: `src/features/vault/logic.ts`, `src/features/vault/__tests__/logic.test.ts`
- Create: `src/features/vault/queries.ts`, `src/features/vault/store.ts`
- Create: `src/features/vault/components/{VaultFolder,FileRow,ImportButton}.tsx`
- Modify: `app/(tabs)/vault.tsx`, `app/course/[id].tsx` (FILES section)

**Interfaces:**
- Consumes: `expo-document-picker`, `expo-file-system` (class API), `expo-sharing`.
- Produces (pure):
```ts
export function sandboxFileName(original: string, taken: string[]): string; // dedupe: "report.pdf" → "report (2).pdf"
export function formatFileSize(bytes: number): string; // "1.2 MB", "340 KB", "12 B"
export function mimeGlyph(mime: string | null | undefined, name: string): string; // pdf 📄, image 🖼, else 📎
```
RN flow: `importFile(courseId, category)` → `DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, type: '*/*' })` → if not canceled: `new File(asset.uri).copy(new File(Paths.document, 'vault', sandboxFileName(name, taken)))` → insert `files` row (`sandboxUri` = dest.uri, size, mime = asset.mimeType).
`openFile(file)` → `Sharing.isAvailableAsync()` then `Sharing.shareAsync(file.sandboxUri)` (share-sheet = open externally in Expo Go).
`deleteFile(file)` → delete sandbox file (if exists) + row.
- Screens: Vault tab = grid of course folder cards (PatternTile header + emoji + file count) + `ALL FILES` folder; course folder → category sheet (4 categories with counts); category → `FileRow` list (glyph, name, size, `Stamp` if described, tap = open, long-press = actions sheet: DESCRIBE/RENAME/DELETE via `Alert.prompt` on Android — note: `Alert.prompt` is iOS-only! → use inline modal for describe/rename: reuse `note-edit`-style modal with single TextInput). Course page FILES section lists that course's files (all categories) + import button.

- [ ] **Step 1: Failing pure tests**

```ts
import { formatFileSize, mimeGlyph, sandboxFileName } from '../logic';
it('dedupes file names', () => {
  expect(sandboxFileName('a.pdf', [])).toBe('a.pdf');
  expect(sandboxFileName('a.pdf', ['a.pdf'])).toBe('a (2).pdf');
  expect(sandboxFileName('a.pdf', ['a.pdf', 'a (2).pdf'])).toBe('a (3).pdf');
});
it('formats sizes', () => {
  expect(formatFileSize(12)).toBe('12 B');
  expect(formatFileSize(340 * 1024)).toBe('340 KB');
  expect(formatFileSize(1.2 * 1024 * 1024)).toBe('1.2 MB');
});
it('glyphs by mime then extension', () => {
  expect(mimeGlyph('application/pdf')).toBe('📄');
  expect(mimeGlyph(undefined, 'x.png')).toBe('🖼');
  expect(mimeGlyph(null, 'x.bin')).toBe('📎');
});
```
Run FAIL → implement → PASS.

- [ ] **Step 2: Sandbox copy flow** (exact API):
```ts
import { File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
const vaultDir = new File(Paths.document, 'vault');
if (!vaultDir.exists) vaultDir.create({ intermediates: true, idempotent: true });
const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, type: '*/*' });
if (res.canceled) return;
const asset = res.assets[0]!;
const dest = new File(vaultDir, sandboxFileName(asset.name, await takenNames()));
await new File(asset.uri).copy(dest);
```

- [ ] **Step 3: Screens** — vault grid, category sheet, file rows, import/open/describe/delete wired; course FILES section.

- [ ] **Step 4: Gates + device** — import a PDF → survives app restart; open shares it; delete removes file from disk (verify via re-import naming or document picker showing absence — or `new File(uri).exists` check in a temporary log).

- [ ] **Step 5: Commit**
```bash
git add -A
git commit -m "feat: file vault with sandbox copy, folders, file actions"
```

---

### Task 24: Notes (teacher said / exam tips)

**Files:**
- Create: `src/features/notes/queries.ts`, `src/features/notes/store.ts`
- Create: `src/features/notes/components/NoteList.tsx`
- Modify: `app/note-edit.tsx`, `app/course/[id].tsx` (NOTES section)

**Interfaces:**
- Consumes: schema `notes`.
- Produces: `useNotes(courseId)` with CRUD; `NoteList` rows: `Stamp` kind chip (`SAID` / `TIP`) + body + description line; `+` → `note-edit` modal (kind chips, body multiline required, optional description, SAVE/DELETE). Course NOTES section renders `NoteList` + add.

- [ ] **Step 1: Validation test** — `validateNote({ kind, body })`: body trimmed non-empty; kind in `('teacher_said','exam_tip')`. Failing first, then implement.

- [ ] **Step 2: queries/store** — standard CRUD mirroring notes table.

- [ ] **Step 3: UI wiring** — note-edit modal handles `id='new'` + `courseId` param; NOTES section in course page (EmptyState glyph="✎").

- [ ] **Step 4: Gates + device** — add exam tip with description → shows on course page, persists.

- [ ] **Step 5: Commit**
```bash
git add -A
git commit -m "feat: course notes with kind stamps and descriptions"
```

---

### Task 25: Backup — ZIP export/import + auto-backup on open

**Files:**
- Create: `src/lib/backup/logic.ts`, `src/lib/backup/__tests__/backup.test.ts`
- Create: `src/features/backup/exporter.ts`, `src/features/backup/importer.ts`
- Modify: `app/settings.tsx` (BACKUP section), `app/_layout.tsx` (auto-backup check)

**Interfaces:**
- Consumes: all query modules, `fflate` (`zipSync`, `unzipSync`), `expo-sharing`, `Paths`/`File`.
- Produces (pure, tested):
```ts
export interface BackupManifest { app: 'school-planner'; version: 1; createdAtIso: string; tables: Record<string, number>; }
export function buildBackupJson(tables: Record<string, unknown[]>): { manifest: BackupManifest; payload: string };
export function parseBackupJson(json: string): { manifest: BackupManifest; tables: Record<string, unknown[]> } | null; // null on invalid/foreign
export function shouldAutoBackup(lastAtMs: number | null, intervalDays: number, nowMs: number): boolean;
```
Rules: `parseBackupJson` validates `app === 'school-planner'` + `version === 1` + tables object; unknown version → null (show error, no partial import). `shouldAutoBackup`: `lastAt === null` → true only if any data exists? No — true (first backup); `now - last >= intervalDays*86400000` → true.
- RN exporter: gather every table via `db.select().from(t)`; JSON → `zipSync({ 'data.json': str, 'files/<name>': bytes... })` (vault files read via `new File(uri).bytes()`); write `backup-<dateId>.zip` under `Paths.document/backups/`; `Sharing.shareAsync(uri, { mimeType: 'application/zip' })`; then `settings.backup_last_at = now`.
- RN importer: pick `.zip` via DocumentPicker → `unzipSync` → `parseBackupJson` → confirm `Alert.alert('Replace all data?', …)` → in ONE drizzle transaction: delete all rows of every table (FK order: children first) → insert rows → copy `files/*` back into vault dir (rewrite `sandboxUri`) → relaunch stores (`refresh()` all stores) + `refreshReminders()`.
- Settings BACKUP section: `EXPORT ZIP` button (square icon + label), `IMPORT` (danger-stamped confirm), interval chips 1/3/7/14, `LAST: <dateId>` in mono.
- App open hook (root layout after migration): `if (shouldAutoBackup(...)) { await exportBackup({ silent: true }); }` — silent = write zip file to `backups/` without sharing sheet.

- [ ] **Step 1: Failing pure tests**

```ts
import { buildBackupJson, parseBackupJson, shouldAutoBackup } from '../logic';
it('roundtrips payload', () => {
  const { manifest, payload } = buildBackupJson({ courses: [{ id: 'c1', name: 'Maths' }] });
  const parsed = parseBackupJson(payload);
  expect(parsed?.manifest.app).toBe('school-planner');
  expect(parsed?.tables.courses).toHaveLength(1);
});
it('rejects foreign or bad json', () => {
  expect(parseBackupJson('{')).toBeNull();
  expect(parseBackupJson(JSON.stringify({ app: 'other', version: 1, tables: {} }))).toBeNull();
  expect(parseBackupJson(JSON.stringify({ app: 'school-planner', version: 99, tables: {} }))).toBeNull();
});
it('auto-backup interval logic', () => {
  const day = 86_400_000;
  expect(shouldAutoBackup(null, 7, 1000)).toBe(true);
  expect(shouldAutoBackup(1000, 7, 1000 + 6 * day)).toBe(false);
  expect(shouldAutoBackup(1000, 7, 1000 + 7 * day)).toBe(true);
});
```
Run FAIL → implement → PASS.

- [ ] **Step 2: exporter** — gather tables, zip, write, share, stamp `backup_last_at`.
- [ ] **Step 3: importer** — full flow with confirm + transaction + file restore + store refresh.
- [ ] **Step 4: settings + auto-backup wiring.**
- [ ] **Step 5: Gates + device round-trip (critical)**

Gates pass. Device: create courses + grades + files → EXPORT ZIP (share sheet opens) → DELETE all data (or reinstall app data via import into wiped state: import with confirm) → everything restored (courses, grades, settings, files openable).

- [ ] **Step 6: Commit**
```bash
git add -A
git commit -m "feat: ZIP backup export/import with auto-backup on open"
```

---

### Task 26: Polish + full QA pass

**Files:**
- Modify: across `src/features/**` (empty states, haptics, copy), `app/(tabs)/*`

**Interfaces:**
- Consumes: everything.
- Produces: consistent empty states on every screen, haptics on chip/stepper/timer events, motion audit, QA checklist executed and results reported.

- [ ] **Step 1: Empty-state sweep** — every screen/section has `<EmptyState glyph label>` with mono lowercase copy (`"no courses yet — tap +"`, `"nothing due"`, `"no files"`, `"not marked yet"`, `"no promises — set one"`, `"no classes today"`, `"no grades"`).

- [ ] **Step 2: Haptics sweep** — `Haptics.selectionAsync()` on FilterChip/SegmentedChips/weekday chips/attendance buttons; `impactAsync(Medium)` on timer start/pause; `notificationAsync(Success)` on timer finish, backup export success.

- [ ] **Step 3: Motion audit** — all presses use press-depth (BrutCard/SquareIconButton); DayDetail morph springy (`withSpring damping 20`); no layout jank: verify tab switch ≤ 16ms dropped frames by eye; grain overlay does not intercept touches (`pointerEvents="none"` — verify by tapping under it).

- [ ] **Step 4: Full QA checklist (device, Expo Go)** — run and record results in the task report:
  1. Cold start → tabs, no red screens, migration ran (existing data intact).
  2. Courses: CRUD + emoji/color/pattern persistence.
  3. Schedule: pattern create/edit/delete; Today hero counts down; class goes active → tick bar → ends.
  4. Calendar: month nav, dots, filters with counts, day detail morph, attendance mark + stats + Today gauge.
  5. Events: create exam `T-6D` chip + description on Today; done stamp; notification scheduled (check Android notification shade).
  6. GPA: grades → final % → gauge; exclude toggles; rounding; scale editor validation; target + needed-on-final bands.
  7. Timer: 1-min run → arc depletes → haptic + mascot + session logged; promise bar advanced.
  8. Vault: import PDF → open → describe → delete.
  9. Notes: add exam tip → appears.
  10. Backup: export ZIP → import (confirm) → data restored.
  11. Settings: values persist across kill/relaunch.
  12. Offline: airplane mode entire pass — zero failures.

- [ ] **Step 5: Fix pass** — fix all failures found (each fix: gates + targeted retest).

- [ ] **Step 6: Final gates + commit**
```bash
npx jest && npx tsc --noEmit && npx eslint .
git add -A
git commit -m "feat: polish pass — empty states, haptics, motion, QA fixes"
```

---

## Plan Self-Review

**Spec coverage:** Sections 1–10 of the spec map to tasks: architecture/scaffold (T1–T5), fonts (T2), design system incl. grain/press-depth/primitives/nav (T3–T4), all 14 tables (T5), courses (T6), settings (T7), schedule+Today+reminders (T8–T12), calendar+filters+day detail+attendance (T13–T15), events+T-minus+agenda (T16–T17), GPA engine/grades/screen/scale editor (T18–T20), timer (T21), promises+mascot (T22), vault (T23), notes (T24), backup (T25), polish+haptics+QA (T26). Spec §7 research verdicts are baked into T13 (flash-calendar theme/children), T11 (animata tick bar exact constants), T20 (custom SVG controls), T1 (no rejected deps). Spec §10 risks: Doto jitter (T2 smoke), Skia shader fallback (T3), fflate smoke (T25), flash-calendar internals read installed types (T14).

**Placeholders:** none — every step carries code, commands, or explicit test bodies. T14 and T11 include explicit "read installed types / correct this math" directives with the exact final behavior specified (not TBD).

**Type consistency:** `PatternInput/ExceptionInput/Occurrence` defined once in T8, consumed in T10/T12; `CourseDraft` (T6) feeds `courses` table fields (T5); settings keys (T7) match engine/GPA/backup usages (T18/T20/T25); `PlannedReminder` (T12) produced by planner consumed by `refreshReminders` (T12/T17).

**Deviations from spec (explicit):**
1. Pattern tiles are component-rendered (PatternTile) instead of pre-baked image files — same visual, avoids texture asset pipeline; grain is a live Skia shader instead of PNG. Both satisfy the "no mixBlendMode" rule.
2. Backup export uses JSON dump + files (not `sqlite backupAsync`) — deterministic across WAL states, same restore guarantee.
3. DSEG font download URLs include a fallback discovery step (GitHub API) since asset names may change.

