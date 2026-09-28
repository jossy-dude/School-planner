import { useCallback, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { usePromisesStore } from '@/features/promises/store';
import { useSettings, useSettingsStore } from '@/features/settings/store';
import { formatDurationMin } from '@/lib/format';
import { BrutCard } from '@/ui/BrutCard';
import { TickBar } from '@/ui/tickbar';
import { colors, fontFamilies } from '@/ui/tokens';
import { studyToday } from '../logic';

// The daily study goal from Settings finally has somewhere to show up.
export function StudyTodayCard() {
  const settings = useSettings();
  const hydrate = useSettingsStore((s) => s.hydrate);
  const sessions = usePromisesStore((s) => s.sessions);
  const refresh = usePromisesStore((s) => s.refresh);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useFocusEffect(useCallback(() => {
    setNowMs(Date.now());
    void hydrate();
    void refresh(settings.week_start).catch(() => {});
  }, [hydrate, refresh, settings.week_start]));

  const { doneMin, goalMin, ratio } = useMemo(
    () => studyToday(sessions, settings.study_goal_min, nowMs, settings.week_start),
    [sessions, settings.study_goal_min, settings.week_start, nowMs],
  );

  return (
    <BrutCard onPress={() => router.push('/(tabs)/timer')}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <Text style={{ fontFamily: fontFamilies.heading, fontSize: 12, color: colors.ink40, letterSpacing: 2 }}>
          STUDIED TODAY
        </Text>
        <Text style={{ fontFamily: fontFamilies.lcd, fontSize: 16, color: colors.ink }}>
          {formatDurationMin(doneMin)}
          <Text style={{ color: colors.ink40 }}> / {formatDurationMin(goalMin)}</Text>
        </Text>
      </View>
      <TickBar progress={ratio} />
    </BrutCard>
  );
}
