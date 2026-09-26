import { ReactNode, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ScaleEditor } from '@/features/gpa/components/ScaleEditor';
import { exportBackup } from '@/features/backup/exporter';
import { importBackup } from '@/features/backup/importer';
import { toDateId } from '@/lib/schedule';
import { BrutCard } from '@/ui/BrutCard';
import { FilterChip, SegmentedChips, SquareIconButton } from '@/ui/primitives';
import { colors, fontFamilies } from '@/ui/tokens';
import { useSettings, useSettingsStore } from '@/features/settings/store';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <BrutCard style={{ marginBottom: 12 }}>
      <Text style={{ fontFamily: fontFamilies.heading, fontSize: 12, color: colors.ink40, letterSpacing: 2, marginBottom: 6 }}>
        {title}
      </Text>
      {children}
    </BrutCard>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, gap: 12 }}>
      <Text style={{ fontFamily: fontFamilies.mono, fontSize: 13, color: colors.ink, flexShrink: 1 }}>{label}</Text>
      {children}
    </View>
  );
}

function Stepper({ value, step, min, max, onChange }: {
  value: number; step: number; min: number; max: number; onChange: (v: number) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <SquareIconButton glyph="–" size={30} label="decrease"
        onPress={() => { Haptics.selectionAsync().catch(() => {}); onChange(clamp(value - step, min, max)); }} />
      <Text style={{ fontFamily: fontFamilies.lcd, fontSize: 16, color: colors.ink, minWidth: 48, textAlign: 'center' }}>
        {value}
      </Text>
      <SquareIconButton glyph="+" size={30} label="increase"
        onPress={() => { Haptics.selectionAsync().catch(() => {}); onChange(clamp(value + step, min, max)); }} />
    </View>
  );
}

export default function SettingsScreen() {
  const settings = useSettings();
  const { set, hydrate } = useSettingsStore();
  useEffect(() => { hydrate(); }, [hydrate]);
  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, padding: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <SquareIconButton glyph="←" onPress={() => router.back()} />
        <Text style={{ fontFamily: fontFamilies.heading, fontSize: 18, color: colors.ink }}>SETTINGS</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <Section title="REMINDERS">
          <Row label="LEAD TIME · MIN">
            <Stepper value={settings.reminder_lead_default_min} step={15} min={0} max={1440}
              onChange={(v) => void set('reminder_lead_default_min', v)} />
          </Row>
        </Section>
        <Section title="STUDY">
          <Row label="DAILY GOAL · MIN">
            <Stepper value={settings.study_goal_min} step={30} min={0} max={720}
              onChange={(v) => void set('study_goal_min', v)} />
          </Row>
        </Section>
        <Section title="WEEK">
          <Row label="WEEK STARTS">
            <View style={{ width: 140 }}>
              <SegmentedChips options={['SUN', 'MON']}
                value={settings.week_start === 'monday' ? 'MON' : 'SUN'}
                onChange={(v) => void set('week_start', v === 'MON' ? 'monday' : 'sunday')} />
            </View>
          </Row>
        </Section>
        <Section title="BACKUP">
          <Row label="INTERVAL · DAYS">
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {[1, 3, 7, 14].map((d) => (
                <FilterChip key={d} label={`${d}D`} active={settings.backup_interval_days === d}
                  onPress={() => void set('backup_interval_days', d)} />
              ))}
            </View>
          </Row>
          <Row label="EXPORT ZIP">
            <SquareIconButton glyph="↓" size={30} label="export zip backup"
              onPress={() => void exportBackup().then(hydrate).catch(() => {})} />
          </Row>
          <Row label="IMPORT">
            <SquareIconButton glyph="↑" size={30} tone="danger" label="import backup"
              onPress={() => void importBackup().catch(() => {})} />
          </Row>
          <Row label="LAST">
            <Text style={{ fontFamily: fontFamilies.mono, fontSize: 13, color: colors.ink }}>
              {settings.backup_last_at === null ? 'never' : toDateId(new Date(settings.backup_last_at))}
            </Text>
          </Row>
        </Section>
        <Section title="GPA">
          <ScaleEditor />
        </Section>
      </ScrollView>
    </View>
  );
}
