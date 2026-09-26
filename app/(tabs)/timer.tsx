import { useCallback, useEffect } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useCoursesStore } from '@/features/courses/store';
import { SessionHistory } from '@/features/timer/components/SessionHistory';
import { SubjectPicker } from '@/features/timer/components/SubjectPicker';
import { TimerFace } from '@/features/timer/components/TimerFace';
import { useTimerStore } from '@/features/timer/store';
import { BrutCard } from '@/ui/BrutCard';
import { SquareIconButton } from '@/ui/primitives';
import { colors, fontFamilies, radius } from '@/ui/tokens';

const DURATIONS = [25, 45, 60, 90];

const sectionTitleStyle = {
  fontFamily: fontFamilies.heading, fontSize: 12, color: colors.ink40, letterSpacing: 2, marginBottom: 10,
} as const;

function DurationChips({ targetMs, disabled, onSelect }: { targetMs: number; disabled: boolean; onSelect: (ms: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {DURATIONS.map((min) => {
        const active = targetMs === min * 60_000;
        return (
          <Pressable
            key={min}
            onPress={disabled ? undefined : () => onSelect(min * 60_000)}
            accessibilityRole="button"
            accessibilityLabel={`${min} minutes`}
            accessibilityState={{ selected: active, disabled }}
            style={{
              flex: 1, paddingVertical: 8, alignItems: 'center',
              borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.ink,
              backgroundColor: active ? colors.ink : colors.paper,
              opacity: disabled ? 0.4 : 1,
            }}
          >
            <Text style={{
              fontFamily: fontFamilies.lcd, fontSize: 14,
              color: active ? colors.paper : colors.ink,
            }}>{min} MIN</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TimerScreen() {
  const state = useTimerStore((s) => s.state);
  const nowMs = useTimerStore((s) => s.nowMs);
  const sessions = useTimerStore((s) => s.sessions);
  const actions = useTimerStore((s) => s.actions);
  const courses = useCoursesStore((s) => s.courses);
  const refreshCourses = useCoursesStore((s) => s.refresh);

  useFocusEffect(
    useCallback(() => {
      void refreshCourses().catch(() => {});
      void actions.refreshSessions().catch(() => {});
    }, [refreshCourses, actions]),
  );

  // Store-backed tick: one subscription drives the per-second re-render.
  // Immediate tick on mount catches up a countdown left running off-screen.
  useEffect(() => {
    void actions.tick(Date.now());
    const id = setInterval(() => { void actions.tick(Date.now()); }, 1000);
    return () => clearInterval(id);
  }, [actions]);

  const locked = state.status !== 'idle';

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, padding: 16 }}>
      <Text style={{ fontFamily: fontFamilies.heading, fontSize: 18, color: colors.ink, marginBottom: 12 }}>
        TIMER
      </Text>
      <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 32 }}>
        <BrutCard>
          <Text style={sectionTitleStyle}>FOCUS</Text>
          <View style={{ alignItems: 'center', marginBottom: 8 }}>
            <TimerFace state={state} nowMs={nowMs} />
          </View>
          <DurationChips targetMs={state.targetMs} disabled={locked} onSelect={actions.setDuration} />
          <View style={{ marginTop: 10 }}>
            <SubjectPicker
              courses={courses}
              selectedId={state.courseId}
              onSelect={actions.select}
              disabled={locked}
            />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 14 }}>
            {state.status === 'running' && (
              <SquareIconButton glyph="⏸" label="pause" onPress={actions.pause} />
            )}
            {state.status !== 'idle' && (
              <SquareIconButton glyph="↻" label="reset" tone="ink70" onPress={actions.reset} />
            )}
            {state.status !== 'idle' && (
              <SquareIconButton glyph="■" label="finish" tone="danger" onPress={() => void actions.finish()} />
            )}
            {state.status !== 'running' && (
              <SquareIconButton
                glyph="▶"
                label={state.status === 'paused' ? 'resume' : 'start'}
                onPress={() => (state.status === 'paused' ? actions.resume() : actions.start(state.courseId, state.targetMs))}
              />
            )}
          </View>
        </BrutCard>
        <BrutCard>
          <Text style={sectionTitleStyle}>SESSIONS</Text>
          <SessionHistory sessions={sessions} courses={courses} />
        </BrutCard>
      </ScrollView>
    </View>
  );
}
