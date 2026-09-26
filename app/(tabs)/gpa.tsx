import { useCallback, useEffect } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useCoursesStore } from '@/features/courses/store';
import { GpaForm } from '@/features/gpa/components/GpaForm';
import { GpaResultCard } from '@/features/gpa/components/GpaResultCard';
import { useGpaResult, useGpaStore } from '@/features/gpa/store';
import { useSettingsStore } from '@/features/settings/store';
import { EmptyState } from '@/ui/primitives';
import { colors, fontFamilies } from '@/ui/tokens';

export default function GpaScreen() {
  const refreshGpa = useGpaStore((s) => s.refresh);
  const refreshCourses = useCoursesStore((s) => s.refresh);
  const courses = useCoursesStore((s) => s.courses);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const result = useGpaResult();

  useFocusEffect(
    useCallback(() => {
      void refreshGpa().catch(() => {});
      void refreshCourses().catch(() => {});
      void hydrateSettings().catch(() => {});
    }, [refreshGpa, refreshCourses, hydrateSettings]),
  );

  // Terms arrive async; once they exist, park the picker on the first one.
  const terms = result.terms;
  const selectedTermId = result.selectedTermId;
  const setSelectedTermId = result.setSelectedTermId;
  useEffect(() => {
    if (selectedTermId === null && terms.length > 0) setSelectedTermId(terms[0]?.id ?? null);
  }, [selectedTermId, terms, setSelectedTermId]);

  const header = (
    <Text style={{ fontFamily: fontFamilies.heading, fontSize: 18, color: colors.ink, marginBottom: 12 }}>
      GPA
    </Text>
  );

  if (courses.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, padding: 16 }}>
        {header}
        <EmptyState glyph="▣" label="no courses yet — GPA starts with a course" />
      </View>
    );
  }

  if (!result.hasGrades) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, padding: 16 }}>
        {header}
        <EmptyState glyph="Ⓦ" label="no grades yet — the gauge wakes up with your first grade" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, padding: 16 }}>
      {header}
      <GpaResultCard
        gpa={result.gpa}
        maxPoints={result.maxPoints}
        rounding={result.rounding}
        totalCredits={result.totalCredits}
        scaleName={result.scale.name}
        mode={result.mode}
        terms={terms}
        selectedTermId={selectedTermId}
        onModeChange={result.setMode}
        onTermChange={result.setSelectedTermId}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <GpaForm result={result} />
      </ScrollView>
    </View>
  );
}
