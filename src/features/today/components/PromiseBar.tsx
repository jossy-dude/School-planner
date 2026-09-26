import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { StudyPromise } from '@/db/schema';
import { PromiseSession, promiseProgress, WeekStart } from '@/lib/promises/logic';
import { TickBar } from '@/ui/tickbar';
import { colors, fontFamilies } from '@/ui/tokens';

interface Props {
  promise: StudyPromise;
  sessions: PromiseSession[];
  nowMs: number;
  weekStart: WeekStart;
  /** Course emoji; omitted (or course not found) falls back to the ◔ placeholder. */
  emoji?: string;
  onLongPress?: () => void;
}

export const PromiseBar = memo(function PromiseBar({ promise, sessions, nowMs, weekStart, emoji, onLongPress }: Props) {
  const { doneMin, targetMin, ratio } = promiseProgress(promise, sessions, nowMs, weekStart);
  const done = Math.floor(doneMin);
  return (
    <Pressable
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={`promise ${promise.subject}, ${done} of ${targetMin} minutes, ${promise.period}`}
      accessibilityHint={onLongPress ? 'long press to delete' : undefined}
      style={({ pressed }) => [{ gap: 6, opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 15 }}>{emoji ?? '◔'}</Text>
        <Text
          numberOfLines={1}
          style={{ flex: 1, fontFamily: fontFamilies.mono, fontSize: 14, color: colors.ink }}
        >
          {promise.subject}
        </Text>
        <Text style={{ fontFamily: fontFamilies.lcd, fontSize: 15, color: colors.ink }}>
          {`${done}/${targetMin}`}
        </Text>
      </View>
      <TickBar progress={ratio} />
    </Pressable>
  );
});
