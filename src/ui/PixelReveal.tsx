import { useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo, LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { colors } from '@/ui/tokens';

// A from-scratch native rebuild of React Bits' web-only <PixelCard/>: that
// component redraws a <canvas> grid on hover/focus, which don't exist on a
// touch screen. The brief here only asked for the *appear* animation played
// once when the app loads, so this drops the canvas + mouse tracking and
// keeps just that: a grid of pixel cells shrinking away from the card's
// content on mount, staggered by distance from the center — the same
// per-cell `withDelay` staggering TickBar already uses elsewhere in this UI.

interface CellSpec { key: string; delayMs: number; color: string }

function Cell({ delayMs, durationMs, color }: { delayMs: number; durationMs: number; color: string }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withDelay(delayMs, withTiming(0, { duration: durationMs }));
  }, [delayMs, durationMs, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={[{ flex: 1, margin: 0.5, backgroundColor: color }, style]} />;
}

const MASK_COLORS = [colors.ink, colors.ink70, colors.paper2] as const;

export function PixelReveal({ children, cols = 9, rows = 5, durationMs = 240, style }: {
  children: React.ReactNode;
  cols?: number;
  rows?: number;
  durationMs?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [measured, setMeasured] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => { if (alive) setReduceMotion(v); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const grid = useMemo<CellSpec[][]>(() => {
    const cx = (cols - 1) / 2;
    const cy = (rows - 1) / 2;
    const maxDist = Math.hypot(cx, cy) || 1;
    return Array.from({ length: rows }, (_, y) =>
      Array.from({ length: cols }, (_, x) => {
        const dist = Math.hypot(x - cx, y - cy) / maxDist;
        return {
          key: `${x}-${y}`,
          delayMs: dist * durationMs * 1.3,
          color: MASK_COLORS[(x + y) % MASK_COLORS.length]!,
        };
      }));
  }, [cols, rows, durationMs]);

  useEffect(() => {
    if (reduceMotion) return;
    const total = durationMs * 1.3 + durationMs + 100;
    const id = setTimeout(() => setDone(true), total);
    return () => clearTimeout(id);
  }, [reduceMotion, durationMs]);

  const onLayout = (e: LayoutChangeEvent) => {
    if (!measured && e.nativeEvent.layout.width > 0) setMeasured(true);
  };

  return (
    <View style={style} onLayout={onLayout}>
      {children}
      {!done && !reduceMotion && measured && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {grid.map((row, y) => (
            <View key={y} style={{ flex: 1, flexDirection: 'row' }}>
              {row.map((cell) => (
                <Cell key={cell.key} delayMs={cell.delayMs} durationMs={durationMs} color={cell.color} />
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
