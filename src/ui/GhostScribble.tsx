import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/ui/tokens';

// A couple of illegible squiggle + strike-through paths, as if something was
// once jotted here in pencil and rubbed out — the kind of ghost mark real
// scrap paper picks up. Purely decorative texture, never real text.
const VARIANTS = [
  'M4 18 C 14 4, 26 4, 34 14 S 54 24, 62 12 M10 26 L 46 24',
  'M2 10 C 16 22, 30 -2, 44 12 S 58 4, 66 16 M6 22 L 40 20 L 58 23',
];

export function GhostScribble({ size = 70, style }: { size?: number; style?: object }) {
  const [variant] = useState(() => VARIANTS[Math.floor(Math.random() * VARIANTS.length)]!);
  return (
    <View pointerEvents="none" style={[{ width: size, height: size * 0.4 }, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 70 28">
        <Path
          d={variant}
          stroke={colors.ink15}
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
          opacity={0.6}
        />
      </Svg>
    </View>
  );
}
