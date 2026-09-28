import { ReactNode } from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { colors, hardShadow, radius } from '@/ui/tokens';

interface Props {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  depth?: number;
}

const springPress = (press: SharedValue<number>, to: number) => {
  press.value = withSpring(to, { damping: 30, stiffness: 600 });
};

export function BrutCard({ children, onPress, onLongPress, style, depth = 3 }: Props) {
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
  if (!onPress && !onLongPress) return body;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => springPress(press, depth)}
      onPressOut={() => springPress(press, 0)}
    >
      {body}
    </Pressable>
  );
}
