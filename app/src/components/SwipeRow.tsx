// 왼쪽으로 밀면 빨간 "삭제"가 나오는 줄 (리포트 목록)
import { ReactNode, useRef } from "react";
import { Animated, PanResponder, Pressable, Text, View } from "react-native";
import { color, font } from "../theme/tokens";

const W = 84;

export function SwipeRow({ children, onDelete, label }: { children: ReactNode; onDelete: () => void; label: string }) {
  const x = useRef(new Animated.Value(0)).current;
  const open = useRef(false);
  const snap = (to: number) => {
    open.current = to !== 0;
    Animated.spring(x, { toValue: to, useNativeDriver: true, bounciness: 0 }).start();
  };
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderMove: (_, g) => x.setValue(Math.min(0, Math.max(-W, (open.current ? -W : 0) + g.dx))),
    onPanResponderRelease: (_, g) => snap((open.current ? -W : 0) + g.dx < -W / 2 ? -W : 0),
    onPanResponderTerminate: () => snap(open.current ? -W : 0),
  })).current;

  return (
    <View style={{ overflow: "hidden" }}
      accessibilityActions={[{ name: "delete", label: `${label} 삭제` }]}
      onAccessibilityAction={(e) => e.nativeEvent.actionName === "delete" && onDelete()}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label} 삭제`} onPress={() => { snap(0); onDelete(); }}
        style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: W, backgroundColor: color.red, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.white }}>삭제</Text>
      </Pressable>
      <Animated.View {...pan.panHandlers} style={{ transform: [{ translateX: x }], backgroundColor: color.white }}>{children}</Animated.View>
    </View>
  );
}
