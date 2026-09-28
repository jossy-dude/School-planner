import { ScrollView, Text, View } from 'react-native';
import { Term } from '@/db/schema';
import { ArcGauge } from '@/ui/ArcGauge';
import { BrutCard } from '@/ui/BrutCard';
import { FilterChip, SegmentedChips } from '@/ui/primitives';
import { colors, fontFamilies } from '@/ui/tokens';
import { GpaMode } from '../store';

interface Props {
  gpa: number | null;
  maxPoints: number;
  rounding: number;
  totalCredits: number;
  scaleName: string;
  mode: GpaMode;
  terms: Term[];
  selectedTermId: string | null;
  onModeChange: (mode: GpaMode) => void;
  onTermChange: (id: string | null) => void;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 2, flex: 1 }}>
      <Text style={{ fontFamily: fontFamilies.mono, fontSize: 10, color: colors.ink40, letterSpacing: 1 }}>
        {label}
      </Text>
      <Text style={{ fontFamily: fontFamilies.lcd, fontSize: 18, color: colors.ink }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export function GpaResultCard({
  gpa,
  maxPoints,
  rounding,
  totalCredits,
  scaleName,
  mode,
  terms,
  selectedTermId,
  onModeChange,
  onTermChange,
}: Props) {
  const segment = mode === 'term' ? 'TERM' : 'CUMULATIVE';
  const showTerms = mode === 'term' && terms.length > 0;
  return (
    <BrutCard style={{ marginBottom: 12 }}>
      <SegmentedChips
        options={['TERM', 'CUMULATIVE']}
        value={segment}
        onChange={(v) => onModeChange(v === 'TERM' ? 'term' : 'cumulative')}
      />
      {showTerms && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexDirection: 'row', gap: 6, paddingTop: 8 }}
        >
          {terms.map((term) => (
            <FilterChip
              key={term.id}
              label={term.name}
              active={term.id === selectedTermId}
              onPress={() => onTermChange(term.id)}
            />
          ))}
        </ScrollView>
      )}
      <View style={{ alignItems: 'center', paddingVertical: 8 }}>
        <ArcGauge value={gpa ?? 0} max={maxPoints} label="GPA" decimals={rounding} />
        {gpa === null && (
          <Text style={{ fontFamily: fontFamilies.mono, fontSize: 11, color: colors.ink40, marginTop: 6 }}>
            no graded courses yet
          </Text>
        )}
      </View>
      <View style={{ flexDirection: 'row', borderTopWidth: 1.5, borderTopColor: colors.ink15, paddingTop: 8 }}>
        <Stat label="CREDITS" value={String(totalCredits)} />
        <Stat label="SCALE" value={scaleName} />
        <Stat label="ROUND" value={String(rounding)} />
      </View>
    </BrutCard>
  );
}
