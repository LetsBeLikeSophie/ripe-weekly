// S_PushAsk: 알림 허용 묻기 (시스템 창을 띄우기 전에 먼저 이유를 보여 준다)
import { View } from "react-native";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import { Button, Screen, T, TextButton, Title } from "../components/ui";
import { color, font, radius } from "../theme/tokens";
import { registerPush } from "../lib/push";

export default function PushAsk() {
  const next = () => router.replace("/home");
  return (
    <Screen footer={
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: "row" }}><Button label="알림 받기" onPress={async () => {
          const { granted } = await Notifications.requestPermissionsAsync();
          if (granted) await registerPush().catch(() => {});
          next();
        }} /></View>
        <TextButton label="나중에 할게요" onPress={next} />
      </View>
    }>
      <View style={{ gap: 14, paddingTop: 40 }}>
        <Title>{"새 리포트가 오면\n알려 드릴까요?"}</Title>
        <T c={color.text3}>일주일에 리포트마다 한 번만 와요. 광고는 보내지 않아요.</T>
      </View>
      <View accessibilityLabel="알림 예시" style={{ marginTop: 36, backgroundColor: color.white, borderRadius: radius.cardLg, padding: 16, gap: 4, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 3 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <T v="micro" c={color.text4} style={{ fontFamily: font.bodyBold }}>Ripe Weekly</T>
          <T v="micro" c={color.text4}>화 오전 8:00</T>
        </View>
        <T v="smallBold">디저트·카페 · 새 리포트</T>
        <T v="caption" c={color.text3}>이번 주 글 63개 읽고 4가지 골랐어요</T>
      </View>
    </Screen>
  );
}
