import { useEffect, useMemo } from 'react';
import { Tabs, router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { SharedValue, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { playSound } from '@/lib/sound';
import { toDateId } from '@/lib/schedule';
import { colors, fontFamilies, hardShadow, radius } from '@/ui/tokens';

const ICONS: Record<string, string> = {
  today: '◉', calendar: '▦', courses: '▣', timer: '◷', vault: '▤', gpa: 'Ⓦ',
};

// The floating "+" is context-aware: it does the thing you'd actually want to
// create from wherever you currently are, rather than one fixed action.
function fabTarget(routeName: string): { href: Parameters<typeof router.push>[0]; label: string } {
  switch (routeName) {
    case 'courses':
      return { href: { pathname: '/course/[id]', params: { id: 'new' } }, label: 'add course' };
    case 'vault':
      return { href: '/file-add', label: 'add file' };
    case 'calendar':
      return {
        href: { pathname: '/event/[id]', params: { id: 'new', dueAt: toDateId(new Date()) } },
        label: 'add event',
      };
    default:
      return { href: { pathname: '/event/[id]', params: { id: 'new' } }, label: 'add event' };
  }
}

type DotTabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    emit(e: unknown): { type?: string; defaultPrevented?: boolean };
    navigate(name: string): void;
  };
};

const springPress = (press: SharedValue<number>, to: number) => {
  press.value = withSpring(to, { damping: 14 });
};

function TabIcon({ glyph, focused, onPress }: { glyph: string; focused: boolean; onPress: () => void }) {
  const t = useSharedValue(focused ? 1 : 0);
  const press = useSharedValue(0);
  useEffect(() => { t.value = withTiming(focused ? 1 : 0, { duration: 180 }); }, [focused, t]);

  const badgeStyle = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ scale: 0.7 + t.value * 0.3 }],
  }));
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 - press.value * 0.12 }] }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => springPress(press, 1)}
      onPressOut={() => springPress(press, 0)}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      hitSlop={6}
      style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
    >
      <Animated.View style={[{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }, pressStyle]}>
        <Animated.View style={[{
          position: 'absolute', width: 34, height: 34, borderRadius: 17, backgroundColor: colors.ink,
        }, badgeStyle]} />
        <Text style={{ fontSize: 16, fontFamily: fontFamilies.mono, color: focused ? colors.paper : colors.ink70 }}>
          {glyph}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export function DotTabBar({ state, navigation }: DotTabBarProps) {
  const insets = useSafeAreaInsets();
  const activeRoute = state.routes[state.index];
  const fab = useMemo(() => fabTarget(activeRoute?.name ?? 'today'), [activeRoute?.name]);

  return (
    <View style={{
      position: 'absolute', left: 16, right: 16, bottom: Math.max(insets.bottom, 12),
      flexDirection: 'row', alignItems: 'center', gap: 10,
    }}>
      <View style={{
        flex: 1, flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center',
        backgroundColor: colors.paper, borderWidth: 2, borderColor: colors.ink,
        borderRadius: radius.pill, paddingVertical: 6, ...hardShadow,
      }}>
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          return (
            <TabIcon
              key={route.key}
              glyph={ICONS[route.name] ?? '•'}
              focused={focused}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) {
                  playSound('tick');
                  navigation.navigate(route.name);
                }
              }}
            />
          );
        })}
      </View>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          router.push(fab.href);
        }}
        accessibilityRole="button"
        accessibilityLabel={fab.label}
        style={{
          width: 52, height: 52, borderRadius: 26, backgroundColor: colors.ink,
          borderWidth: 2, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center', ...hardShadow,
        }}
      >
        <Text style={{ fontSize: 22, color: colors.paper, fontFamily: fontFamilies.heading }}>+</Text>
      </Pressable>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(p) => <DotTabBar {...p} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { paddingBottom: 78 },
      }}
    >
      {Object.keys(ICONS).map((name) => (
        <Tabs.Screen key={name} name={name} options={{ title: name.toUpperCase() }} />
      ))}
    </Tabs>
  );
}
