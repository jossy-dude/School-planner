import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Stamp } from '@/ui/primitives';
import { colors, fontFamilies, hardShadow } from '@/ui/tokens';
import { Mascot } from './Mascot';

const AUTO_DISMISS_MS = 4000;

export function CelebrationOverlay({ minutes, onDismiss }: { minutes: number; onDismiss: () => void }) {
  useEffect(() => {
    const id = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(id);
  }, [onDismiss]);

  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
      <Pressable
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="dismiss celebration"
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: colors.ink, opacity: 0.35 }}
      />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
        <View style={{
          alignItems: 'center', gap: 12, backgroundColor: colors.paper,
          borderWidth: 2, borderColor: colors.ink, padding: 20, ...hardShadow,
        }}>
          <Mascot size={64} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Stamp text="DONE" />
            <Text style={{ fontFamily: fontFamilies.lcd, fontSize: 26, color: colors.ink }}>
              {`${minutes}M`}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
