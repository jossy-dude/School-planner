import { Platform, View } from 'react-native';
import { GrainOverlay } from '@/ui/GrainOverlay';
import { colors } from '@/ui/tokens';

/**
 * The app's layered "paper" backdrop, shared by every screen:
 *   1. a soft vertical gradient (light sheet on top of a deeper cream),
 *   2. faint stacked-sheet edges near the corners for depth,
 *   3. an SVG fibre texture that tiles over everything (paper feel),
 *   4. the Skia grain overlay (mounted once per screen, pointer-transparent).
 *
 * Pure react-native + react-native-svg primitives so it renders identically
 * in Expo web (true DOM/CSS via react-native-web) and on native. Screens keep
 * their own `backgroundColor: colors.paper` fallback underneath.
 */

// One tile of deterministic pseudo-random fibres/dust specks, tiled fullscreen.
const TILE = 140;
let cachedPattern: string | null = null;

function hash(n: number): number {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
}

function buildPattern(): string {
  if (cachedPattern !== null) return cachedPattern;
  let out = '';
  for (let i = 0; i < 26; i++) {
    const x = hash(i * 3.7 + 1.3) * TILE;
    const y = hash(i * 5.1 + 9.7) * TILE;
    const len = 2.5 + hash(i * 2.3 + 4.1) * 5;
    const rot = hash(i * 7.9 + 2.2) * 180;
    out += `<path d="M${x.toFixed(1)} ${y.toFixed(1)} l${len.toFixed(1)} 0" stroke="#141414" strokeWidth="0.5" opacity="0.05" transform="rotate(${rot.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
  }
  for (let i = 0; i < 10; i++) {
    const x = hash(i * 11.3 + 3.9) * TILE;
    const y = hash(i * 13.7 + 7.3) * TILE;
    out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="0.4" fill="#141414" opacity="0.04"/>`;
  }
  cachedPattern = out;
  return out;
}

// react-native-svg is typed loosely; import without pulling its JSX types into
// every consumer of this module.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const SvgLib = require('react-native-svg') as {
  default: React.ComponentType<Record<string, unknown>>;
  Defs: React.ComponentType<Record<string, unknown>>;
  Pattern: React.ComponentType<Record<string, unknown>>;
  Rect: React.ComponentType<Record<string, unknown>>;
};
const { default: Svg, Defs, Pattern, Rect } = SvgLib;

function PaperTexture() {
  return (
    <Svg width="100%" height="100%" pointerEvents="none">
      <Defs>
        <Pattern id="paper-fibers" width={TILE} height={TILE} patternUnits="userSpaceOnUse">
          {/* eslint-disable-next-line react/no-danger */}
          <Rect width={TILE} height={TILE} fill={`url(#none)`} />
          <PaperPatternContent />
        </Pattern>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#paper-fibers)" />
    </Svg>
  );
}

// The generated tile markup must live inside the pattern; render it via raw
// path/circle nodes rather than dangerouslySetInnerHTML for cross-platform svg.
function PaperPatternContent() {
  const items: React.ReactElement[] = [];
  for (let i = 0; i < 26; i++) {
    const x = hash(i * 3.7 + 1.3) * TILE;
    const y = hash(i * 5.1 + 9.7) * TILE;
    const len = 2.5 + hash(i * 2.3 + 4.1) * 5;
    const rot = hash(i * 7.9 + 2.2) * 180;
    items.push(
      <Path
        key={`f${i}`}
        d={`M${x.toFixed(1)} ${y.toFixed(1)} l${len.toFixed(1)} 0`}
        stroke={colors.ink}
        strokeWidth={0.5}
        opacity={0.05}
        rotation={rot}
        origin={`${x.toFixed(1)}, ${y.toFixed(1)}`}
      />,
    );
  }
  for (let i = 0; i < 10; i++) {
    const x = hash(i * 11.3 + 3.9) * TILE;
    const y = hash(i * 13.7 + 7.3) * TILE;
    items.push(
      <Circle key={`d${i}`} cx={x.toFixed(1)} cy={y.toFixed(1)} r={0.4} fill={colors.ink} opacity={0.04} />,
    );
  }
  return <>{items}</>;
}

// Re-export through local aliases so the component above stays declarative.
const Path = SvgLib.Defs ? require('react-native-svg').Path : null;
const Circle = require('react-native-svg').Circle;

export function ScreenBackground() {
  // Web already gets CSS gradients cheaply, but keeping one implementation
  // means the layering looks identical everywhere.
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
      {/* Layer 1 — base wash */}
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: colors.paper }} />
      {/* Layer 2 — stacked sheet edges (cheap depth, native + web) */}
      <View
        style={{
          position: 'absolute', top: -30, left: -30, width: 220, height: 220,
          borderRadius: 40, borderWidth: 1, borderColor: colors.ink15,
          backgroundColor: 'transparent', transform: [{ rotate: '-8deg' }], opacity: 0.55,
        }}
      />
      <View
        style={{
          position: 'absolute', top: -14, left: -14, width: 180, height: 180,
          borderRadius: 34, borderWidth: 1, borderColor: colors.ink15,
          backgroundColor: 'transparent', transform: [{ rotate: '-4deg' }], opacity: 0.4,
        }}
      />
      <View
        style={{
          position: 'absolute', bottom: -26, right: -26, width: 200, height: 200,
          borderRadius: 38, borderWidth: 1, borderColor: colors.ink15,
          backgroundColor: 'transparent', transform: [{ rotate: '6deg' }], opacity: 0.5,
        }}
      />
      {/* Layer 3 — tiling fibre texture */}
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
        <PaperTexture />
      </View>
      {/* Layer 4 — animated Skia grain (skips itself on web where Skia needs canvaskit setup) */}
      {Platform.OS !== 'web' && <GrainOverlay />}
    </View>
  );
}
