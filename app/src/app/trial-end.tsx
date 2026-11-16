// S_TrialEnd: 체험 끝 (설정은 남고, 지난 리포트는 계속 볼 수 있다)
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { Button, IconTile, Screen, T, TextButton, Title } from "../components/ui";
import { color, font, radius } from "../theme/tokens";
import { listReports, listTopics, Report, Topic } from "../lib/api";

export default function TrialEnd() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  useEffect(() => { listTopics().then(setTopics); listReports().then((r) => setReports(r.filter((x) => x.status === "succeeded"))); }, []);
  const read = reports.reduce((s, r) => s + (r.docs_read ?? 0), 0);
  const found = reports.reduce((s, r) => s + (r.payload?.items.length ?? 0), 0);
  const stats = [[reports.length, "리포트"], [read, "읽은 글"], [found, "찾은 흐름"]] as const;
  return (
    <Screen footer={
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: "row" }}><Button label="요금제 보기 · 월 2,900원부터" onPress={() => router.push("/paywall")} /></View>
        <TextButton label="지난 리포트만 볼게요" onPress={() => router.replace("/home")} />
      </View>
    }>
      <T v="label" style={{ paddingTop: 8 }}>RIPE WEEKLY</T>
      <Title style={{ marginTop: 24 }}>{"무료 체험이\n끝났어요."}</Title>
      <View style={{ marginTop: 22, gap: 10 }}>
        <T v="bodyBold" c={color.text3}>7일 동안 받아 본 것</T>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {stats.map(([n, l]) => (
            <View key={l} style={{ flex: 1, backgroundColor: color.white, borderRadius: radius.card, paddingVertical: 14, alignItems: "center", gap: 2 }}>
              <Text style={{ fontFamily: font.title, fontSize: 28, color: color.blue }}>{n}</Text>
              <T v="caption" c={color.text3}>{l}</T>
            </View>
          ))}
        </View>
        <View style={{ backgroundColor: color.white, borderRadius: radius.card, paddingHorizontal: 14 }}>
          {topics.map((t, i) => (
            <View key={t.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 60, borderBottomWidth: i < topics.length - 1 ? 1 : 0, borderColor: color.divider }}>
              <View style={{ opacity: 0.6 }}><IconTile icon={t.icon} title={t.title} size={38} /></View>
              <T v="bodyBold" c={color.text3} style={{ flex: 1 }}>{t.title}</T>
              <T v="caption" c={color.text4}>쉬는 중</T>
            </View>
          ))}
        </View>
        <T v="caption" c={color.text4}>설정은 그대로 남아 있어요. 요금제를 고르면 다음 주부터 바로 다시 와요. 지난 리포트는 계속 볼 수 있어요.</T>
      </View>
    </Screen>
  );
}
