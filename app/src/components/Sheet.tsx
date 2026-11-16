// 아래에서 올라오는 시트. 모달 화면은 전부 이 틀을 쓴다: 손잡이, "제목 + 닫기", 본문, 버튼.
// 라우터에서 presentation: "transparentModal" 로 띄우면 뒤에 원래 화면이 보이고 그 위를 어둡게 덮는다.
import { ReactNode, useEffect, useRef } from "react";
import { Animated, Easing, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { color, radius, space } from "../theme/tokens";
import { IconButton, Title } from "./ui";

export function Sheet({ title, children, footer, onClose }: { title: string; children?: ReactNode; footer?: ReactNode; onClose?: () => void }) {
  const inset = useSafeAreaInsets();
  const y = useRef(new Animated.Value(600)).current;
  useEffect(() => {
    Animated.timing(y, { toValue: 0, duration: 380, easing: Easing.bezier(0.2, 0.8, 0.2, 1), useNativeDriver: true }).start();
  }, [y]);
  const close = onClose ?? (() => router.back());
  return (
    <View style={{ flex: 1, justifyContent: "flex-end" }}>
      <Pressable accessibilityLabel="닫기" onPress={close} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: color.dim }} />
      <Animated.View accessibilityViewIsModal style={{ transform: [{ translateY: y }], backgroundColor: color.bg, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet,
        paddingHorizontal: space.screenX, paddingTop: 12, paddingBottom: Math.max(inset.bottom, 16) + 14, gap: 14 }}>
        <View style={{ alignSelf: "center", width: 40, height: 5, borderRadius: radius.pill, backgroundColor: color.grabber }} />
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <Title size="h3" color={color.ink} style={{ flex: 1 }}>{title}</Title>
          <View style={{ marginTop: -8, marginRight: -10 }}><IconButton name="close" label="닫기" onPress={close} iconColor={color.text3} /></View>
        </View>
        {children}
        {footer}
      </Animated.View>
    </View>
  );
}
