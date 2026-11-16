// B05 로그인 시트: 필수 동의(만 14세 이상 포함) 후 카카오·구글
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Sheet } from "../components/Sheet";
import { Button, CheckBox, T, TextButton } from "../components/ui";
import { color, font, radius } from "../theme/tokens";
import { loginWith } from "../lib/auth";

export default function Login() {
  const [req, setReq] = useState(false);
  const [improve, setImprove] = useState(true);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState<"kakao" | "google" | null>(null);

  const go = async (p: "kakao" | "google") => {
    setBusy(p);
    try {
      const r = await loginWith(p, { improve });
      if (r === "ok") { router.dismissAll(); router.replace("/push"); }
      else if (r === "cancelled") router.replace("/login-fail");
    } catch {
      router.replace("/login-fail");
    } finally { setBusy(null); }
  };

  return (
    <Sheet title="매주 받아 볼까요?">
      <T v="small" c={color.text2} style={{ marginTop: -6 }}>로그인하면 <Text style={{ fontFamily: font.bodyBold }}>매주 화요일 아침 8시</Text>에 보내 드려요. 요일이나 받는 곳은 나중에 설정에서 바꿀 수 있어요.</T>
      <View style={{ alignSelf: "flex-start", backgroundColor: color.blueSoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
        <T v="micro" c={color.blue} style={{ fontFamily: font.bodyBold }}>AI가 만드는 리포트예요</T>
      </View>

      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: "row" }}><Button kind="kakao" label="카카오로 시작 · 카톡으로도 받기" disabled={!req} loading={busy === "kakao"} onPress={() => go("kakao")} /></View>
        <View style={{ flexDirection: "row" }}><Button kind="google" label="Google로 시작" disabled={!req} loading={busy === "google"} onPress={() => go("google")} /></View>
      </View>

      <View>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ flex: 1 }}><CheckBox on={req} onPress={() => setReq(!req)} label="만 14세 이상이고, 필수 약관에 모두 동의" /></View>
          <TextButton label={more ? "접기" : "자세히"} onPress={() => setMore(!more)} />
        </View>
        {more ? (
          <View style={{ paddingLeft: 36, gap: 6, paddingBottom: 6 }}>
            <T v="caption" c={color.text3}>만 14세 이상이에요</T>
            {["이용약관", "개인정보 처리방침", "개인정보 국외 이전 (AI가 리포트를 만들 때 해외 서버를 써요)"].map((x) => (
              <Pressable key={x} accessibilityRole="link" onPress={() => router.push("/terms")}>
                <T v="caption" c={color.text3}>{x} · <Text style={{ textDecorationLine: "underline" }}>보기</Text></T>
              </Pressable>
            ))}
            <T v="caption" c={color.text3}>리포트는 AI가 웹 글을 읽고 만들어요. 틀린 내용이 있을 수 있어요</T>
          </View>
        ) : null}
        <CheckBox on={improve} onPress={() => setImprove(!improve)}>
          <T v="caption" c={color.text3} style={{ flex: 1 }}>(선택) 읽은 기록으로 내 리포트를 더 정확하게 · 광고엔 안 써요</T>
        </CheckBox>
      </View>
    </Sheet>
  );
}
