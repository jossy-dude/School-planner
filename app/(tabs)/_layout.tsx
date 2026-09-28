import { Tabs } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontFamilies } from '@/ui/tokens';

const ICONS: Record<string, string> = {
  today: '◉', calendar: '▦', courses: '▣', timer: '◷', vault: '▤', gpa: 'Ⓦ',
};

type DotTabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    emit(e: unknown): { type?: string; defaultPrevented?: boolean };
    navigate(name: string): void;
  };
};

export function DotTabBar({ state, navigation }: DotTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{
      flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
      backgroundColor: colors.paper, borderTopWidth: 1.5, borderTopColor: colors.ink,
      paddingHorizontal: 8, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 8),
    }}>
      {state.routes.map((route, i) => {
        const focused = state.index === i;
        return (
          <Pressable
            key={route.key}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            style={{ alignItems: 'center', gap: 3, width: 48 }}
          >
            <Text style={{
              fontSize: 17,
              color: focused ? colors.ink : colors.ink40,
              fontFamily: fontFamilies.mono,
            }}>{ICONS[route.name] ?? '•'}</Text>
            <View style={{
              width: 5, height: 5, borderRadius: 3,
              backgroundColor: focused ? colors.ink : 'transparent',
            }} />
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs tabBar={(p) => <DotTabBar {...p} />} screenOptions={{ headerShown: false }}>
      {Object.keys(ICONS).map((name) => (
        <Tabs.Screen key={name} name={name} options={{ title: name.toUpperCase() }} />
      ))}
    </Tabs>
  );
}
