import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { GpaScale } from '@/db/schema';
import { useSettings, useSettingsStore } from '@/features/settings/store';
import { Scale, ScaleRow, sortScaleRows, validateScale } from '@/lib/gpa';
import { SquareIconButton } from '@/ui/primitives';
import { colors, fontFamilies, hardShadow, radius } from '@/ui/tokens';
import { activeScale } from '../logic';
import { listGpaScales, upsertGpaScale } from '../queries';

const label = {
  fontFamily: fontFamilies.mono, fontSize: 11, color: colors.ink40, letterSpacing: 1,
} as const;

const fieldBox = {
  borderWidth: 2, borderColor: colors.ink, backgroundColor: colors.paper,
  borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 8,
  fontFamily: fontFamilies.body, fontSize: 15, color: colors.ink,
} as const;

interface EditRow { key: string; letter: string; minPct: string; points: string }

let keyCounter = 0;
const nextKey = () => `row-${keyCounter++}`;

const parseNum = (text: string) => (text.trim() === '' ? NaN : Number(text.trim()));

// Displayed rows stay sorted by minPct descending — re-sorted on blur so the
// validation (which runs as-given) never trips over a mid-edit order flip.
function resort(list: EditRow[]): EditRow[] {
  return [...list].sort((a, b) => {
    const av = parseNum(a.minPct);
    const bv = parseNum(b.minPct);
    const an = Number.isFinite(av) ? av : -Infinity;
    const bn = Number.isFinite(bv) ? bv : -Infinity;
    return bn - an;
  });
}

function toEditRows(rows: ScaleRow[]): EditRow[] {
  return rows.map((row) => ({
    key: nextKey(),
    letter: row.letter,
    minPct: String(row.minPct),
    points: String(row.points),
  }));
}

export function ScaleEditor() {
  const settings = useSettings();
  const setSetting = useSettingsStore((s) => s.set);
  const [scales, setScales] = useState<GpaScale[]>([]);
  const [rows, setRows] = useState<EditRow[] | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const active = useMemo(
    () => activeScale(scales, settings.gpa_scale_id),
    [scales, settings.gpa_scale_id],
  );

  // Seed the editor whenever the active scale changes (first load, saved a
  // scale, or picked a different one from the GPA tab's chips). React's
  // render-adjustment pattern — setState during render, guarded by the previous
  // scale identity (no effect, no cascading render from an effect body).
  const [seededFor, setSeededFor] = useState<Scale | null>(null);
  if (active !== seededFor) {
    setSeededFor(active);
    setRows(toEditRows(active.rows));
    setName(active.name);
    setSaveError(null);
  }

  useEffect(() => {
    void listGpaScales()
      .then(setScales)
      .catch(() => setScales([]));
  }, []);

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 1500);
    return () => clearTimeout(timer);
  }, [saved]);

  const parsed: ScaleRow[] = (rows ?? []).map((row) => ({
    letter: row.letter.trim(),
    minPct: parseNum(row.minPct),
    points: parseNum(row.points),
  }));
  const validation = rows === null ? { ok: false, errors: [] as string[] } : validateScale(parsed);
  const tooFew = (rows?.length ?? 0) < 2;
  const nameEmpty = name.trim() === '';
  const canSave = rows !== null && validation.ok && !tooFew && !nameEmpty && !saving;

  const updateRow = (key: string, patch: Partial<EditRow>) =>
    setRows((prev) => (prev ? prev.map((row) => (row.key === key ? { ...row, ...patch } : row)) : prev));

  const addRow = () =>
    setRows((prev) =>
      prev ? [...prev, { key: nextKey(), letter: '', minPct: '', points: '0' }] : prev,
    );

  const removeRow = (key: string) => {
    if ((rows?.length ?? 0) <= 2) {
      Alert.alert('Two rows minimum', 'A scale needs at least two rows (e.g. pass and fail).');
      return;
    }
    Alert.alert('Remove row?', 'This edits the scale in the form only — save to keep it.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => setRows((prev) => (prev ? prev.filter((row) => row.key !== key) : prev)),
      },
    ]);
  };

  const save = async () => {
    if (!canSave || rows === null) return;
    setSaving(true);
    setSaveError(null);
    try {
      const existing = scales.find((s) => s.id === settings.gpa_scale_id);
      const row = await upsertGpaScale({
        id: existing?.id,
        name: name.trim(),
        rows: sortScaleRows(parsed),
        // First scale ever saved becomes the default row; updates keep their flag.
        isDefault: existing ? existing.isDefault : scales.length === 0,
      });
      await setSetting('gpa_scale_id', row.id);
      setScales(await listGpaScales());
      setSaved(true);
    } catch {
      setSaveError('Could not save scale');
    } finally {
      setSaving(false);
    }
  };

  if (rows === null) {
    return (
      <Text style={{ fontFamily: fontFamilies.mono, fontSize: 13, color: colors.ink40 }}>loading…</Text>
    );
  }

  return (
    <View style={{ gap: 8 }}>
      <View style={{ gap: 6 }}>
        <Text style={label}>NAME</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="4.0"
          placeholderTextColor={colors.ink40}
          style={fieldBox}
          accessibilityLabel="scale name"
        />
      </View>

      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <Text style={[label, { flex: 1 }]}>LETTER</Text>
        <Text style={[label, { flex: 1, textAlign: 'center' }]}>MIN %</Text>
        <Text style={[label, { flex: 1, textAlign: 'center' }]}>POINTS</Text>
        <View style={{ width: 30 }} />
      </View>

      {rows.map((row) => (
        <View key={row.key} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TextInput
            value={row.letter}
            onChangeText={(t) => updateRow(row.key, { letter: t })}
            placeholder="A"
            placeholderTextColor={colors.ink40}
            maxLength={6}
            autoCapitalize="characters"
            style={[fieldBox, { flex: 1, textAlign: 'center' }]}
            accessibilityLabel="letter"
          />
          <TextInput
            value={row.minPct}
            onChangeText={(t) => updateRow(row.key, { minPct: t })}
            onBlur={() => setRows((prev) => (prev ? resort(prev) : prev))}
            placeholder="90"
            placeholderTextColor={colors.ink40}
            keyboardType="decimal-pad"
            style={[fieldBox, { flex: 1, textAlign: 'center', fontFamily: fontFamilies.lcd }]}
            accessibilityLabel="min percent"
          />
          <TextInput
            value={row.points}
            onChangeText={(t) => updateRow(row.key, { points: t })}
            placeholder="4"
            placeholderTextColor={colors.ink40}
            keyboardType="decimal-pad"
            style={[fieldBox, { flex: 1, textAlign: 'center', fontFamily: fontFamilies.lcd }]}
            accessibilityLabel="points"
          />
          <SquareIconButton
            glyph="×"
            size={30}
            tone="danger"
            label="remove row"
            onPress={() => removeRow(row.key)}
          />
        </View>
      ))}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <SquareIconButton glyph="+" size={30} label="add row" onPress={addRow} />
        <Text style={label}>ADD ROW</Text>
      </View>

      {(tooFew || nameEmpty || !validation.ok) && (
        <View accessibilityRole="alert">
          {nameEmpty && (
            <Text style={{ fontFamily: fontFamilies.mono, fontSize: 12, color: colors.danger }}>
              scale name is required
            </Text>
          )}
          {tooFew && (
            <Text style={{ fontFamily: fontFamilies.mono, fontSize: 12, color: colors.danger }}>
              scale needs at least two rows
            </Text>
          )}
          {validation.errors.map((error) => (
            <Text
              key={error}
              style={{ fontFamily: fontFamilies.mono, fontSize: 12, color: colors.danger }}
            >
              {error}
            </Text>
          ))}
        </View>
      )}

      {saveError !== null && (
        <Text style={{ fontFamily: fontFamilies.mono, fontSize: 12, color: colors.danger }} accessibilityRole="alert">
          {saveError}
        </Text>
      )}

      <Pressable
        onPress={() => void save()}
        disabled={!canSave}
        accessibilityRole="button"
        style={{
          backgroundColor: colors.ink, borderWidth: 2, borderColor: colors.ink,
          paddingVertical: 12, alignItems: 'center', borderRadius: radius.md,
          opacity: canSave ? 1 : 0.4, ...hardShadow,
        }}
      >
        <Text style={{ fontFamily: fontFamilies.heading, fontSize: 13, color: colors.paper }}>
          {saved ? 'SAVED ✓' : saving ? 'SAVING…' : 'SAVE SCALE'}
        </Text>
      </Pressable>
    </View>
  );
}
