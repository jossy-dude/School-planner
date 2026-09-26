import { Text, TextInput, View } from 'react-native';
import { colors, fontFamilies, radius } from '@/ui/tokens';
import { isValidTime, normalizeTime } from '../logic';

const boxStyle = {
  borderWidth: 2, borderRadius: radius.sm, backgroundColor: colors.paper,
  fontFamily: fontFamilies.mono, fontSize: 16, color: colors.ink,
  paddingVertical: 6, paddingHorizontal: 8, textAlign: 'center' as const, minWidth: 46,
} as const;

export function TimeField({ value, onChange, label }: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  const [hh = '', mm = ''] = value.split(':');
  const invalid = hh !== '' && mm !== '' && !isValidTime(value);
  const borderColor = invalid ? colors.danger : colors.ink;

  const setPart = (part: 'hh' | 'mm', text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 2);
    onChange(part === 'hh' ? `${digits}:${mm}` : `${hh}:${digits}`);
  };
  const handleBlur = () => onChange(normalizeTime(`${hh}:${mm}`));

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <TextInput
        value={hh}
        onChangeText={(t) => setPart('hh', t)}
        onBlur={handleBlur}
        keyboardType="number-pad"
        maxLength={2}
        placeholder="00"
        placeholderTextColor={colors.ink40}
        accessibilityLabel={label ? `${label} hour` : 'hour'}
        style={[boxStyle, { borderColor }]}
      />
      <Text style={{ fontFamily: fontFamilies.mono, fontSize: 16, color: colors.ink40 }}>:</Text>
      <TextInput
        value={mm}
        onChangeText={(t) => setPart('mm', t)}
        onBlur={handleBlur}
        keyboardType="number-pad"
        maxLength={2}
        placeholder="00"
        placeholderTextColor={colors.ink40}
        accessibilityLabel={label ? `${label} minute` : 'minute'}
        style={[boxStyle, { borderColor }]}
      />
    </View>
  );
}
