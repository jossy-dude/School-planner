import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '@/ui/tokens';

const ICONS: Record<string, string> = {
  today: '◉', calendar: '▦', courses: '▣',
  timer: '◷', vault: '▤', gpa: 'Ⓦ',
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.ink40,
        tabBarLabelStyle: { fontFamily: 'ShareTechMono', fontSize: 10 },
        tabBarStyle: { backgroundColor: colors.paper, borderTopColor: colors.ink15 },
      }}
      tabBar={undefined}
    >
      {Object.keys(ICONS).map((name) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: name.toUpperCase(),
            tabBarIcon: ({ color }) => (
              <Text style={{ color, fontSize: 18, fontFamily: 'ShareTechMono' }}>
                {ICONS[name]}
              </Text>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
