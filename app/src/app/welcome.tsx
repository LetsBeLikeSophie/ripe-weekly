// B01 시작 화면
import { Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, T, TextButton } from "../components/ui";
import { RipeMark } from "../components/RipeMark";
import { color, font, space } from "../theme/tokens";

export default function Welcome() {
  const inset = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: color.bg, overflow: "hidden" }}>
      <View style={{ paddingTop: inset.top + 12, paddingHorizontal: space.screenX, flexDirection: "row", justifyContent: "space-between" }}>
        <T v="label">RIPE WEEKLY</T>
        <T v="label">매주 3분 트렌드 리포트</T>
      </View>
      <Text accessibilityRole="header" style={{ marginTop: 22, paddingHorizontal: space.screenX, fontFamily: font.title, fontSize: 62, lineHeight: 64, letterSpacing: -1, color: color.blue }}>
        {"트렌드,\n이제 훑기만\n하세요."}
      </Text>
      <T v="small" c={color.text2} style={{ marginTop: 16, marginHorizontal: space.screenX, width: 260, lineHeight: 23 }}>
        비싼 AI 구독 없이도 괜찮아요. 내 분야에서 지금 뜨는 것만 골라 매주 3분짜리 리포트로 보내 드려요.
      </T>
      <View style={{ position: "absolute", right: 24, top: inset.top + 256 }}><RipeMark size={84} /></View>

      {/* 대표 사진 자리: 사진이 정해지면 Image 로 바꾼다 */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 330 + inset.bottom, backgroundColor: "#C9935C" }} />
      <Text style={{ position: "absolute", left: 24, bottom: 170 + inset.bottom, fontFamily: font.logo, fontSize: 48, lineHeight: 52, color: color.white, transform: [{ rotate: "-6deg" }] }}>Ripe Weekly</Text>

      <View style={{ position: "absolute", left: space.screenX, right: space.screenX, bottom: inset.bottom + 20, gap: 6 }}>
        <View style={{ flexDirection: "row" }}><Button label="로그인 없이 바로 써 보기" onPress={() => router.push("/create")} /></View>
        <TextButton label="이미 계정이 있어요" c="#2A1608" onPress={() => router.push("/login")} />
      </View>
    </View>
  );
}

