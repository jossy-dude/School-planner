import { memo } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { colors } from '@/ui/tokens';

interface Props { color: string; pattern: 'dots' | 'stripes' | 'grid'; height?: number; style?: StyleProp<ViewStyle> }

function PatternTileBase({ color, pattern, height = 72, style }: Props) {
  const cells: React.ReactNode[] = [];
  const cols = 14;
  if (pattern === 'dots') {
    for (let i = 0; i < cols * 3; i++) {
      cells.push(<View key={i} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: color }} />);
    }
  } else if (pattern === 'stripes') {
    for (let i = 0; i < 14; i++) {
      cells.push(<View key={i} style={{ width: 4, height: '160%', backgroundColor: color, transform: [{ rotate: '35deg' }] }} />);
    }
  } else {
    for (let i = 0; i < cols * 3; i++) {
      cells.push(<View key={i} style={{ width: 4, height: 4, borderWidth: 1, borderColor: color }} />);
    }
  }
  return (
    <View style={[{ height, backgroundColor: colors.paper2, flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 8, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, style]}>
      {cells}
    </View>
  );
}
export const PatternTile = memo(PatternTileBase);
