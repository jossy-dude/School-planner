import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { HeroCard } from '@/features/today/components/HeroCard';
import { BrutCard } from '@/ui/BrutCard';
import { EmptyState, SquareIconButton } from '@/ui/primitives';
import { colors, fontFamilies } from '@/ui/tokens';

function Section({ title, glyph, label }: { title: string; glyph: string; label: string }) {
  return (
    <BrutCard>
      <Text style={{ fontFamily: fontFamilies.heading, fontSize: 12, color: colors.ink40, letterSpacing: 2, marginBottom: 6 }}>
        {title}
      </Text>
      <EmptyState glyph={glyph} label={label} />
    </BrutCard>
  );
}

export default function TodayScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, padding: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontFamily: fontFamilies.heading, fontSize: 18, color: colors.ink }}>TODAY</Text>
        <SquareIconButton glyph="⚙" onPress={() => router.push('/settings')} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 32, gap: 16 }}>
        <HeroCard />
        <Section title="PROMISES" glyph="✓" label="no promises yet" />
        <Section title="DUE" glyph="✎" label="nothing due" />
        <Section title="ATTENDANCE" glyph="◌" label="no attendance yet" />
      </ScrollView>
    </View>
  );
}
