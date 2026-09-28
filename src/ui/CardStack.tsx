import { ReactNode, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors, hardShadow, radius } from '@/ui/tokens';

// A from-scratch native rebuild of React Bits' web-only <Stack/> (built on
// `motion/react` + mouse drag): the same "flick a card past a threshold to
// send it to the back of the pile" idea, using react-native-gesture-handler's
// Pan gesture + a Reanimated spring instead. A plain tap opens the card
// (`onPress`) rather than shuffling it — for a stack of real files/notes,
// browsing and opening are different actions and shouldn't share a gesture.

export interface StackCardItem {
  key: string;
  content: ReactNode;
}

const SPRING = { damping: 20, stiffness: 260 };

function DraggableCard({ children, depth, total, sensitivity, width, height, onSendToBack, onPress, onLongPress }: {
  children: ReactNode;
  depth: number; // 0 = top of the pile
  total: number;
  sensitivity: number;
  width: number;
  height: number;
  onSendToBack: () => void;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const restRotate = depth === 0 ? 0 : (depth % 2 === 0 ? 1 : -1) * Math.min(depth * 2.5, 7);
  const restScale = 1 - Math.min(depth, 4) * 0.045;

  const pan = Gesture.Pan()
    .enabled(depth === 0)
    .onUpdate((e) => {
      x.value = e.translationX;
      y.value = e.translationY;
    })
    .onEnd((e) => {
      const past = Math.abs(e.translationX) > sensitivity || Math.abs(e.translationY) > sensitivity;
      x.value = withSpring(0, SPRING);
      y.value = withSpring(0, SPRING);
      if (past) runOnJS(onSendToBack)();
    });

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotateZ: `${restRotate}deg` },
      { scale: restScale },
    ],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          { position: 'absolute', width, height, zIndex: total - depth, ...hardShadow },
          style,
        ]}
      >
        <Pressable
          onPress={depth === 0 ? onPress : undefined}
          onLongPress={depth === 0 ? onLongPress : undefined}
          style={{
            flex: 1, borderRadius: radius.md, overflow: 'hidden',
            borderWidth: 1.5, borderColor: colors.ink, backgroundColor: colors.paper2,
          }}
        >
          {children}
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

export function CardStack({ cards, width, height, sensitivity = 70, onCardPress, onCardLongPress }: {
  cards: StackCardItem[];
  width: number;
  height: number;
  sensitivity?: number;
  onCardPress?: (key: string) => void;
  onCardLongPress?: (key: string) => void;
}) {
  const keysJoined = cards.map((c) => c.key).join('|');
  const [order, setOrder] = useState<string[]>(() => cards.map((c) => c.key));
  // Re-sync order when the underlying set of cards changes (a file was added
  // or removed): adjusted during render, React's sanctioned way to reset
  // derived state in response to a prop change, rather than in an effect —
  // new keys are appended, stale ones dropped, existing order otherwise kept
  // so a mid-browse stack doesn't jump around.
  const [syncedKeysJoined, setSyncedKeysJoined] = useState(keysJoined);
  if (keysJoined !== syncedKeysJoined) {
    setSyncedKeysJoined(keysJoined);
    const keySet = new Set(cards.map((c) => c.key));
    setOrder((prev) => {
      const kept = prev.filter((k) => keySet.has(k));
      const added = cards.map((c) => c.key).filter((k) => !kept.includes(k));
      return [...kept, ...added];
    });
  }

  const byKey = new Map(cards.map((c) => [c.key, c]));
  const sendToBack = (key: string) => {
    setOrder((prev) => [...prev.filter((k) => k !== key), key]);
  };

  if (order.length === 0) return null;

  // Render back-to-front so later (top) cards paint over earlier ones.
  const visibleFromTop = [...order].reverse();

  return (
    <View style={{ width, height }}>
      {visibleFromTop.map((key, depth) => {
        const card = byKey.get(key);
        if (!card) return null;
        return (
          <DraggableCard
            key={key}
            depth={depth}
            total={visibleFromTop.length}
            sensitivity={sensitivity}
            width={width}
            height={height}
            onSendToBack={() => sendToBack(key)}
            onPress={onCardPress ? () => onCardPress(key) : undefined}
            onLongPress={onCardLongPress ? () => onCardLongPress(key) : undefined}
          >
            {card.content}
          </DraggableCard>
        );
      })}
    </View>
  );
}
