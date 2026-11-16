// S_Withdraw: 구독 해지 여부는 링크로 묻고, 취소 / 탈퇴
import { useState } from "react";
import { Linking, Text, View } from "react-native";
import { router } from "expo-router";
import { ButtonPair, Card, Screen, T, Title, TopBar } from "../components/ui";
import { color, font } from "../theme/tokens";
import { withdraw } from "../lib/api";
import { manageSubscriptionUrl } from "../lib/store";

export default function Withdraw() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <Screen top={<TopBar title="탈퇴" />} footer={
      <View style={{ gap: 8 }}>
        {err ? <T v="caption" c={color.red} style={{ textAlign: "center" }}>{err}</T> : null}
        <ButtonPair label="탈퇴" danger disabled={busy} onCancel={() => router.back()} onPress={async () => {
          setBusy(true); setErr("");
          try { await withdraw(); router.dismissAll(); router.replace("/welcome"); }
          catch (e: any) { setErr(e?.message ?? "탈퇴하지 못했어요"); setBusy(false); }
        }} />
      </View>
    }>
      <Title color={color.red} style={{ marginTop: 20 }}>{"정말\n탈퇴할까요?"}</Title>
      <T c={color.text3} style={{ marginTop: 14 }}>리포트 설정, 받은 리포트, 질문, 기억한 내 상황이 <Text style={{ fontFamily: font.bodyBold, color: color.ink }}>바로 지워져요.</Text> 결제 기록만 법에 따라 5년 보관돼요.</T>
      <Card tone="soft" style={{ marginTop: 20, gap: 4 }}>
        <T v="bodyBold">구독은 해지하셨나요?</T>
        <T v="small" c={color.text3}>탈퇴해도 구독은 자동으로 해지되지 않아요. <Text accessibilityRole="link" onPress={() => Linking.openURL(manageSubscriptionUrl())} style={{ color: color.blue, fontFamily: font.bodyBold, textDecorationLine: "underline" }}>구독 해지하러 가기</Text></T>
      </Card>
    </Screen>
  );
}
