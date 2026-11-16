// S_Limit: 베이직은 리포트 1개까지 → 플러스로 바꾸기 / 기존 리포트 바꾸기
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Sheet } from "../components/Sheet";
import { ButtonPair, T } from "../components/ui";
import { color, font, radius } from "../theme/tokens";
import { listTopics, Topic } from "../lib/api";

export default function Limit() {
  const [pick, setPick] = useState<"plus" | "swap">("plus");
  const [first, setFirst] = useState<Topic | null>(null);
  useEffect(() => { listTopics().then((t) => setFirst(t.find((x) => x.enabled) ?? t[0] ?? null)); }, []);
  const opts = [
    { id: "plus" as const, title: "플러스로 바꾸기", side: "월 5,900원", desc: "리포트 3개까지 받아요. 차액만 결제돼요." },
    { id: "swap" as const, title: "기존 리포트 바꾸기", side: first?.title ?? "", desc: "지금 리포트 대신 새 리포트를 받아요. 지난 리포트는 남아요." },
  ];
  return (
    <Sheet title="베이직은 리포트 1개까지예요" footer={
      <ButtonPair label="확인" onCancel={() => router.back()} onPress={() => {
        if (pick === "plus") router.replace({ pathname: "/paywall", params: { plan: "plus" } });
        else if (first) router.replace({ pathname: "/topic/[id]/settings", params: { id: first.id } });
      }} />
    }>
      <View style={{ gap: 10 }} accessibilityRole="radiogroup">
        {opts.map((o) => {
          const on = pick === o.id;
          return (
            <Pressable key={o.id} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => setPick(o.id)}
              style={{ gap: 4, padding: 16, paddingVertical: 14, borderRadius: 18, borderWidth: 2, borderColor: on ? color.blue : color.line, backgroundColor: on ? color.blueSoft : color.white }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
                <T v="bodyBold" style={{ fontSize: 16 }}>{o.title}</T>
                <T v="caption" style={{ fontFamily: font.bodyBold }}>{o.side}</T>
              </View>
              <T v="caption" c={color.text3}>{o.desc}</T>
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}
