import { ReactNode, useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSettings, useSettingsStore } from '@/features/settings/store';
import { neededOnFinal, targetGpaNeeded } from '@/lib/gpa';
import { BrutCard } from '@/ui/BrutCard';
import { EmptyState, FilterChip, SquareIconButton, Stamp, TMinusChip } from '@/ui/primitives';
import { colors, fontFamilies, radius } from '@/ui/tokens';
import { TARGET_LETTERS, TargetLetter, defaultTargetPct, targetPointsFor } from '../logic';
import { GpaResultBundle } from '../store';

const sectionTitle = {
  fontFamily: fontFamilies.heading, fontSize: 12, color: colors.ink40, letterSpacing: 2, marginBottom: 6,
} as const;

const label = {
  fontFamily: fontFamilies.mono, fontSize: 11, color: colors.ink40, letterSpacing: 1,
} as const;

const fieldBox = {
  borderWidth: 2, borderColor: colors.ink, backgroundColor: colors.paper,
  borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10,
  fontFamily: fontFamilies.body, fontSize: 16, color: colors.ink,
} as const;

// No native slider dependency: a tappable tick row (10..100, step 5).
const WEIGHT_TICKS = Array.from({ length: 19 }, (_, i) => 10 + i * 5);

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <BrutCard>
      <Text style={sectionTitle}>{title}</Text>
      {children}
    </BrutCard>
  );
}

function Stepper({ value, step, min, max, onChange }: {
  value: number; step: number; min: number; max: number; onChange: (v: number) => void;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <SquareIconButton glyph="–" size={30} label="decrease"
        onPress={() => { Haptics.selectionAsync().catch(() => {}); onChange(clamp(value - step)); }} />
      <Text style={{ fontFamily: fontFamilies.lcd, fontSize: 16, color: colors.ink, minWidth: 44, textAlign: 'center' }}>
        {value}
      </Text>
      <SquareIconButton glyph="+" size={30} label="increase"
        onPress={() => { Haptics.selectionAsync().catch(() => {}); onChange(clamp(value + step)); }} />
    </View>
  );
}

const chipRow = { flexDirection: 'row' as const, gap: 6, paddingBottom: 8 };

export function GpaForm({ result }: { result: GpaResultBundle }) {
  const settings = useSettings();
  const setSetting = useSettingsStore((s) => s.set);
  const rows = result.rows;

  const [target, setTarget] = useState<TargetLetter | null>(null);
  const [chosenCourseId, setChosenCourseId] = useState<string | null>(null);
  const [typedByCourse, setTypedByCourse] = useState<Record<string, string>>({});
  const [weight, setWeight] = useState(50);
  const [targetPct, setTargetPct] = useState(() => defaultTargetPct(result.scale));

  // Solver course = the user's pick while it is still in view, else the first
  // non-excluded row (derived during render — no state sync effect).
  const chosenValid = chosenCourseId !== null && rows.some((r) => r.course.id === chosenCourseId);
  const fallbackRow = rows.find((r) => !r.excluded) ?? rows[0] ?? null;
  const finalCourseId = chosenValid ? chosenCourseId : fallbackRow ? fallbackRow.course.id : null;
  const selectedRow = rows.find((r) => r.course.id === finalCourseId) ?? null;

  // Current %: typed text per course, seeded from that course's computed grade.
  const seededText =
    selectedRow && selectedRow.finalPct !== null
      ? String(Math.round(selectedRow.finalPct * 10) / 10)
      : '';
  const typedText = finalCourseId !== null ? typedByCourse[finalCourseId] : undefined;
  const currentText = typedText ?? seededText;
  const setCurrentText = (value: string) => {
    if (finalCourseId === null) return;
    const courseId = finalCourseId;
    setTypedByCourse((prev) => ({ ...prev, [courseId]: value }));
  };

  const need = useMemo(() => {
    if (target === null) return null;
    return targetGpaNeeded(result.inputs, result.scale, targetPointsFor(target, result.scale));
  }, [target, result.inputs, result.scale]);

  const currentPct = currentText.trim() === '' ? NaN : Number(currentText.trim());
  const solver =
    finalCourseId !== null && Number.isFinite(currentPct)
      ? neededOnFinal({ currentPct, finalWeight: weight / 100, targetPct })
      : null;

  const toggleExcluded = (courseId: string) => {
    const excluded = settings.gpa_excluded.includes(courseId);
    const next = excluded
      ? settings.gpa_excluded.filter((id) => id !== courseId)
      : [...settings.gpa_excluded, courseId];
    void setSetting('gpa_excluded', next);
  };

  if (rows.length === 0) {
    return (
      <Section title="COURSES">
        <EmptyState glyph="▣" label="no courses in this term" />
      </Section>
    );
  }

  return (
    <View style={{ gap: 16 }}>
      <Section title="SCALE">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ ...chipRow, flexDirection: 'row' }}
        >
          <FilterChip
            label="USE DEFAULT"
            active={settings.gpa_scale_id === null}
            onPress={() => void setSetting('gpa_scale_id', null)}
          />
          {result.scales.map((scale) => (
            <FilterChip
              key={scale.id}
              label={scale.name}
              active={settings.gpa_scale_id === scale.id}
              onPress={() => void setSetting('gpa_scale_id', scale.id)}
            />
          ))}
        </ScrollView>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={label}>ROUNDING · DECIMALS</Text>
          <Stepper
            value={settings.gpa_rounding}
            step={1}
            min={0}
            max={3}
            onChange={(v) => void setSetting('gpa_rounding', v)}
          />
        </View>
      </Section>

      <Section title="COURSES">
        <View style={{ gap: 8 }}>
          {rows.map(({ course, finalPct, excluded }) => (
            <View
              key={course.id}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 8,
                borderWidth: 1.5, borderColor: colors.ink, borderRadius: radius.sm,
                backgroundColor: colors.paper, padding: 8,
              }}
            >
              <Text style={{ fontSize: 18 }}>{course.emoji}</Text>
              <Text
                style={{ flex: 1, fontFamily: fontFamilies.body, fontSize: 14, color: colors.ink }}
                numberOfLines={1}
              >
                {course.name}
              </Text>
              <Text
                style={{
                  fontFamily: fontFamilies.lcd, fontSize: 14,
                  color: finalPct === null ? colors.ink40 : colors.ink,
                }}
              >
                {finalPct === null ? '—' : `${finalPct.toFixed(0)}%`}
              </Text>
              <FilterChip label="EXCL" active={excluded} onPress={() => toggleExcluded(course.id)} />
            </View>
          ))}
        </View>
      </Section>

      <Section title="TARGET">
        <View style={{ ...chipRow, flexDirection: 'row', flexWrap: 'wrap' }}>
          {TARGET_LETTERS.map((letter) => (
            <FilterChip
              key={letter}
              label={letter}
              active={target === letter}
              onPress={() => setTarget(target === letter ? null : letter)}
            />
          ))}
        </View>
        {target !== null && (
          <BrutCard depth={1} style={{ backgroundColor: colors.paper }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={label}>NEED</Text>
              {need === null ? (
                <Text style={{ fontFamily: fontFamilies.lcd, fontSize: 22, color: colors.ink40 }}>N/A</Text>
              ) : (
                <Text style={{ fontFamily: fontFamilies.lcd, fontSize: 22, color: colors.ink }}>
                  {Math.max(need, 0).toFixed(2)}
                </Text>
              )}
            </View>
            <Text style={{ fontFamily: fontFamilies.mono, fontSize: 11, color: colors.ink40, marginTop: 4 }}>
              {need === null
                ? 'nothing left to average — every credit is already graded'
                : need < 0
                  ? 'graded work already clears this target'
                  : `average points needed on remaining credits for a ${target}`}
            </Text>
          </BrutCard>
        )}
      </Section>

      <Section title="FINAL">
        <View style={{ gap: 6 }}>
          <Text style={label}>COURSE</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ flexDirection: 'row', gap: 6 }}
          >
            {rows.map(({ course }) => (
              <FilterChip
                key={course.id}
                label={`${course.emoji} ${course.name}`}
                active={course.id === finalCourseId}
                onPress={() => setChosenCourseId(course.id)}
              />
            ))}
          </ScrollView>
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={label}>CURRENT %</Text>
            <TextInput
              value={currentText}
              onChangeText={setCurrentText}
              placeholder="—"
              placeholderTextColor={colors.ink40}
              keyboardType="decimal-pad"
              style={[fieldBox, { fontFamily: fontFamilies.lcd }]}
              accessibilityLabel="current percent"
            />
          </View>
          <View style={{ gap: 6 }}>
            <Text style={label}>TARGET %</Text>
            <Stepper value={targetPct} step={1} min={0} max={100} onChange={setTargetPct} />
          </View>
        </View>

        <View style={{ gap: 6, marginTop: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={label}>FINAL WEIGHT %</Text>
            <Text style={{ fontFamily: fontFamilies.lcd, fontSize: 16, color: colors.ink }}>{`${weight}%`}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 28 }}>
            {WEIGHT_TICKS.map((w) => (
              <Pressable
                key={w}
                onPress={() => setWeight(w)}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: 28 }}
                accessibilityRole="button"
                accessibilityLabel={`final weight ${w} percent`}
              >
                <View
                  style={{
                    width: '100%',
                    height: w === weight ? 26 : w < weight ? 18 : 12,
                    backgroundColor: w <= weight ? colors.ink : colors.ink15,
                    borderRadius: 1,
                  }}
                />
              </Pressable>
            ))}
          </View>
        </View>

        {solver === null ? (
          <Text style={{ fontFamily: fontFamilies.mono, fontSize: 11, color: colors.ink40, marginTop: 8 }}>
            enter your current % to solve for the final
          </Text>
        ) : (
          <BrutCard depth={1} style={{ backgroundColor: colors.paper, marginTop: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <View>
                <Text style={label}>NEED ON FINAL</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                  <Text
                    style={{
                      fontFamily: fontFamilies.lcd, fontSize: 26,
                      color: solver.neededPct > 100 ? colors.danger : colors.ink,
                    }}
                  >
                    {solver.neededPct.toFixed(1)}
                  </Text>
                  {solver.neededPct > 100 && <TMinusChip text=">100" tone="danger" />}
                </View>
              </View>
              <Stamp
                text={
                  solver.band === 'safe'
                    ? 'SAFE'
                    : solver.band === 'borderline'
                      ? 'BORDERLINE'
                      : 'IMPOSSIBLE'
                }
                tone={solver.band === 'impossible' ? 'danger' : 'ink'}
              />
            </View>
          </BrutCard>
        )}
      </Section>
    </View>
  );
}
