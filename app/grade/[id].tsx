import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type { Grade } from '@/db/schema';
import { GradeForm } from '@/features/grades/components/GradeForm';
import { getGradeById } from '@/features/grades/queries';
import { EmptyState, SquareIconButton } from '@/ui/primitives';
import { colors, fontFamilies } from '@/ui/tokens';

function Header({ title }: { title: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <SquareIconButton glyph="←" onPress={() => router.back()} size={40} />
      <Text style={{ fontFamily: fontFamilies.heading, fontSize: 16, color: colors.ink }}>{title}</Text>
    </View>
  );
}

export default function GradeModal() {
  const { id, courseId } = useLocalSearchParams<{ id?: string; courseId?: string }>();
  const [resolved, setResolved] = useState<{ id: string; grade: Grade | null } | null>(null);

  const isNew = id === 'new';

  useEffect(() => {
    if (id === undefined || id === 'new') return;
    let alive = true;
    void getGradeById(id)
      .then((g) => { if (alive) setResolved({ id, grade: g }); })
      .catch(() => { if (alive) setResolved({ id, grade: null }); });
    return () => { alive = false; };
  }, [id]);

  const existing = !isNew && resolved !== null && resolved.id === id ? resolved.grade : null;
  const loading = !isNew && (resolved === null || resolved.id !== id);

  let content: ReactNode;
  if (!id || !courseId) {
    content = <EmptyState glyph="Ⓦ" label="missing grade id" />;
  } else if (loading) {
    content = <EmptyState glyph="Ⓦ" label="loading…" />;
  } else if (!isNew && !existing) {
    content = <EmptyState glyph="Ⓦ" label="grade not found" />;
  } else {
    content = <GradeForm key={existing?.id ?? 'new'} grade={existing ?? undefined} courseId={courseId} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, padding: 16, gap: 16 }}>
      <Header title={!id || !courseId ? 'GRADE' : isNew ? 'NEW GRADE' : 'EDIT GRADE'} />
      {content}
    </View>
  );
}
