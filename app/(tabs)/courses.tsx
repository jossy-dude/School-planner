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
        <Text style={{ fontSize: 22, color: colors.ink }}>{item.emoji}</Text>
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
        <SquareIconButton glyph="+" onPress={() => router.push({ pathname: '/course/[id]', params: { id: 'new' } })} />
      </View>
      {courses.length === 0
        ? <EmptyState glyph="▣" label="no courses yet — tap +" />
        : <FlatList style={{ flex: 1 }} data={courses} keyExtractor={(c) => c.id} renderItem={renderItem} contentContainerStyle={{ paddingBottom: 24 }} />}
    </View>
  );
}
