// S_PaySuccess: 결제 완료 (버튼은 "확인" 하나)
import { useEffect, useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button, InfoRows, Screen, T, Title } from "../components/ui";
import { RipeMark } from "../components/RipeMark";
import { color } from "../theme/tokens";
import { getProfile, listTopics } from "../lib/api";
import { monthDay } from "../lib/format";

export default function PaySuccess() {
  const { plan = "basic", period = "month" } = useLocalSearchParams<{ plan?: string; period?: string }>();
  const [n, setN] = useState(0);
  const [next, setNext] = useState<string | null>(null);
  useEffect(() => {
    listTopics().then((t) => setN(t.length));
    getProfile().then((p) => { const d = new Date(p?.trial_ends_at ?? Date.now()); if (period === "year") d.setFullYear(d.getFullYear() + 1); else d.setMonth(d.getMonth() + 1); setNext(d.toISOString()); });
  }, [period]);
  const plus = plan === "plus";
  const price = plus ? (period === "year" ? "연 59,000원" : "월 5,900원") : (period === "year" ? "연 29,000원" : "월 2,900원");
  return (
    <Screen footer={<View style={{ flexDirection: "row" }}><Button label="확인" onPress={() => { router.dismissAll(); router.replace("/home"); }} /></View>}>
      <View style={{ alignItems: "flex-start", gap: 18, paddingTop: 40 }}>
        <RipeMark size={64} />
        <Title>{"이제 매주\n받아요."}</Title>
      </View>
      <View style={{ marginTop: 24 }}>
        <InfoRows rows={[
          { k: "요금제", v: `${plus ? "플러스" : "베이직"} · ${price}` },
          { k: "받을 수 있는 리포트", v: `${plus ? 3 : 1}개 (지금 ${n}개)` },
          { k: "다음 결제", v: monthDay(next) },
        ]} />
      </View>
      <T v="caption" c={color.text4} style={{ marginTop: 14 }}>해지는 앱스토어·구글플레이 구독 관리에서 언제든 할 수 있어요.</T>
    </Screen>
  );
}
