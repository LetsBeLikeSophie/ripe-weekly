// B13 요금제: 월간/연간, 베이직·플러스, 자동 결제 안내, 약관·구매 복원
import { useState } from "react";
import { Linking, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, IconButton, T, TextButton, Title } from "../components/ui";
import { color, font, radius, space } from "../theme/tokens";
import { purchase, restore } from "../lib/store";

export default function Paywall() {
  const inset = useSafeAreaInsets();
  const params = useLocalSearchParams<{ plan?: string }>();
  const [plan, setPlan] = useState<"basic" | "plus">(params.plan === "plus" ? "plus" : "basic");
  const [Y, setY] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const list = [
    { id: "basic" as const, name: "베이직", price: Y ? "29,000원" : "2,900원", unit: Y ? " /년" : " /월", best: true, feats: ["내 맞춤 리포트 1개 · 매주", "물어보기 월 10번", "카톡·메일로도 알림"] },
    { id: "plus" as const, name: "플러스", price: Y ? "59,000원" : "5,900원", unit: Y ? " /년" : " /월", best: false, feats: ["내 맞춤 리포트 3개 · 매주", "깊게 보는 심층 리포트 월 2번", "물어보기 월 30번"] },
  ];
  const cur = list.find((p) => p.id === plan)!;
  const renew = `${cur.name} ${cur.price}${cur.unit.replace(" /", "/")}로`;
  const buy = async () => {
    setBusy(true); setErr("");
    try { const ok = await purchase(plan, Y ? "year" : "month"); if (ok) router.replace({ pathname: "/pay-success", params: { plan, period: Y ? "year" : "month" } }); }
    catch (e: any) { setErr(e?.message ?? "결제하지 못했어요"); }
    setBusy(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: color.bg, paddingTop: inset.top }}>
      <View style={{ paddingHorizontal: 16, minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <IconButton name="close" label="닫기" onPress={() => router.back()} />
        <View accessibilityRole="tablist" style={{ flexDirection: "row", backgroundColor: color.white, borderRadius: radius.pill, padding: 4, borderWidth: 1.5, borderColor: color.line }}>
          {[["월간", false], ["연간 · 2달 무료", true]].map(([l, y]) => (
            <Pressable key={l as string} accessibilityRole="tab" accessibilityState={{ selected: Y === y }} onPress={() => setY(y as boolean)}
              style={{ paddingHorizontal: 14, minHeight: 36, justifyContent: "center", borderRadius: radius.pill, backgroundColor: Y === y ? color.blue : "transparent" }}>
              <T v="caption" c={Y === y ? color.white : color.ink} style={{ fontFamily: font.bodyBold }}>{l as string}</T>
            </Pressable>
          ))}
        </View>
        <View style={{ width: 44 }} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.screenX, paddingTop: 8, paddingBottom: 16, gap: 12 }}>
        <Title>{"체험 끝나면\n이걸로 계속 받아요"}</Title>
        <View accessibilityRole="radiogroup" style={{ gap: 10, marginTop: 6 }}>
          {list.map((p) => {
            const on = plan === p.id;
            return (
              <Pressable key={p.id} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => setPlan(p.id)}
                style={{ gap: 8, paddingHorizontal: 18, paddingVertical: 16, borderRadius: radius.cardLg, borderWidth: 2, borderColor: on ? color.blue : color.line, backgroundColor: on ? color.blue : color.white }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <T v="bodyBold" c={on ? color.white : color.ink} style={{ fontSize: 18 }}>{p.name}</T>
                    {p.best ? <View style={{ borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: on ? color.white : color.blueSoft }}><Text style={{ fontFamily: font.bodyBold, fontSize: 11, color: color.blue }}>추천</Text></View> : null}
                  </View>
                  <Text style={{ color: on ? color.white : color.ink }}>
                    <Text style={{ fontFamily: font.title, fontSize: 24 }}>{p.price}</Text>
                    <Text style={{ fontFamily: font.body, fontSize: 13 }}>{p.unit}</Text>
                  </Text>
                </View>
                {p.feats.map((f) => <T key={f} v="small" c={on ? color.white : color.text3}>· {f}</T>)}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: space.screenX, paddingBottom: inset.bottom + 10, gap: 8 }}>
        {err ? <T v="caption" c={color.red} style={{ textAlign: "center" }}>{err}</T> : null}
        {Platform.OS === "web" ? (
          <T v="small" c={color.text3} style={{ textAlign: "center" }}>구독은 Ripe Weekly 앱에서 할 수 있어요. 같은 계정으로 로그인하면 웹에서도 그대로 받아요.</T>
        ) : (
          <View style={{ flexDirection: "row" }}><Button label={`7일 무료로 시작`} loading={busy} onPress={buy} /></View>
        )}
        <T v="micro" c={color.text4} style={{ textAlign: "center" }}>7일 무료 체험이 끝나면 <Text style={{ fontFamily: font.bodyBold }}>{renew}</Text> 자동 결제돼요. 결제일 24시간 전까지 스토어 구독 관리에서 언제든 해지할 수 있어요.</T>
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 4 }}>
          <TextButton label="이용약관" underline onPress={() => router.push({ pathname: "/terms", params: { tab: "terms" } })} />
          <TextButton label="개인정보 처리방침" underline onPress={() => router.push({ pathname: "/terms", params: { tab: "privacy" } })} />
          <TextButton label="구매 복원" underline onPress={async () => { try { if (await restore()) router.replace("/home"); } catch (e: any) { setErr(e?.message ?? ""); } }} />
        </View>
      </View>
    </View>
  );
}
