import { ReactNode } from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors, hardShadow, radius } from '@/ui/tokens';

interface Props {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  depth?: number;
}

export function BrutCard({ children, onPress, style, depth = 3 }: Props) {
  const press = useSharedValue(0);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: press.value }, { translateY: press.value }],
    shadowOpacity: 1 - press.value / depth,
  }));
  const body = (
    <Animated.View
      style={[
        {
          backgroundColor: colors.paper2,
          borderRadius: radius.md,
          padding: 12,
          ...hardShadow,
          borderWidth: 1.5,
          borderColor: colors.ink,
        },
        animStyle,
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
  if (!onPress) return body;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        // react-hooks/immutability false positive: Reanimated shared values are mutable by design
        // eslint-disable-next-line react-hooks/immutability
        press.value = withSpring(depth, { damping: 30, stiffness: 600 });
      }}
      onPressOut={() => {
        // eslint-disable-next-line react-hooks/immutability
        press.value = withSpring(0, { damping: 30, stiffness: 600 });
      }}
    >
      {body}
    </Pressable>
  );
}
