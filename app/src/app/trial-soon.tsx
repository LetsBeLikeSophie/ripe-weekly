// S_TrialSoon: 체험 끝나기 전날 안내
import { useEffect, useState } from "react";
import { Linking, Text } from "react-native";
import { router } from "expo-router";
import { Sheet } from "../components/Sheet";
import { ButtonPair, InfoRows, T } from "../components/ui";
import { color } from "../theme/tokens";
import { getProfile, Profile } from "../lib/api";
import { monthDay } from "../lib/format";
import { manageSubscriptionUrl } from "../lib/store";

export default function TrialSoon() {
  const [p, setP] = useState<Profile | null>(null);
  useEffect(() => { getProfile().then(setP); }, []);
  return (
    <Sheet title="내일 체험이 끝나요" footer={<ButtonPair cancel="요금제 보기" onCancel={() => router.replace("/paywall")} label="확인" onPress={() => router.back()} />}>
      <InfoRows rows={[{ k: "결제일", v: monthDay(p?.trial_ends_at) }, { k: "요금제", v: "베이직 · 월 2,900원" }]} />
      <T v="small" c={color.text3}>원하지 않으면 오늘까지 <Text accessibilityRole="link" onPress={() => Linking.openURL(manageSubscriptionUrl())} style={{ color: color.blue, textDecorationLine: "underline" }}>구독 관리</Text>에서 해지하면 결제되지 않아요.</T>
    </Sheet>
  );
}
