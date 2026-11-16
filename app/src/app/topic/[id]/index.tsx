// B16 지난 리포트 (타임라인)
import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton, T, Title } from "../../../components/ui";
import { Icon } from "../../../components/Icon";
import { color, font, radius, space } from "../../../theme/tokens";
import { getTopic, listReports, Report, Topic } from "../../../lib/api";
import { monthDay, scheduleLabel } from "../../../lib/format";

export default function Archive() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const inset = useSafeAreaInsets();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  useFocusEffect(useCallback(() => {
    getTopic(id).then(setTopic);
    listReports(id).then((r) => setReports(r.filter((x) => x.status === "succeeded" || x.status === "failed")));
  }, [id]));

  const meta = (r: Report, i: number) => {
    if (r.status === "failed") return "못 만든 회차";
    if (i === reports.length - 1) return "처음 받은 리포트";
    if (r.payload?.quiet) return "조용한 주";
    const n = r.payload?.items.filter((x) => x.stage === "new" || x.stage === "rising").length ?? 0;
    const c = r.payload?.items.filter((x) => x.stage === "cooling").length ?? 0;
    return [n ? `새로 ${n}개` : "", c ? `식는 중 ${c}개` : ""].filter(Boolean).join(" · ") || "변화 정리";
  };

  return (
    <View style={{ flex: 1, backgroundColor: color.bg, paddingTop: inset.top }}>
      <View style={{ paddingHorizontal: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 52 }}>
        <IconButton name="back" label="받은 리포트로" onPress={() => router.back()} />
        <Pressable accessibilityRole="link" onPress={() => router.push({ pathname: "/topic/[id]/settings", params: { id } })}
          style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: color.blueSoft }}>
          <Icon name="gear" size={18} stroke={color.blue} />
          <T v="smallBold" c={color.blue}>설정</T>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.screenX, paddingTop: 10, paddingBottom: inset.bottom + 24, gap: 18 }}>
        <View style={{ gap: 4 }}>
          <Title>{topic?.title ?? ""}</Title>
          <T v="small" c={color.text3}>{topic ? `${scheduleLabel(topic.cron)} · 지금까지 ${reports.length}번 받았어요` : ""}</T>
        </View>
        <View accessibilityRole="list">
          {reports.map((r, i) => {
            const isNew = r.status === "succeeded" && !r.is_read;
            return (
              <View key={r.id} style={{ flexDirection: "row", gap: 14 }}>
                <View style={{ alignItems: "center", width: 20 }}>
                  <View style={{ width: 12, height: 12, borderRadius: 6, marginTop: 20, backgroundColor: isNew ? color.blue : color.blueLine, borderWidth: isNew ? 4 : 0, borderColor: color.barIdle }} />
                  <View style={{ width: 2, flexGrow: 1, backgroundColor: i < reports.length - 1 ? color.barIdle : "transparent" }} />
                </View>
                <Pressable accessibilityRole="link" onPress={() => router.push({ pathname: "/report/[id]", params: { id: r.id } })}
                  style={{ flex: 1, gap: 3, backgroundColor: color.white, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 10, borderWidth: isNew ? 2 : 0, borderColor: color.blue }}>
                  <T v="caption" c={color.text3}>{monthDay(r.created_at)}{isNew ? <Text style={{ fontFamily: font.bodyBold, color: color.blue }}>  안 읽음</Text> : null}</T>
                  <T v="bodyBold" style={{ fontSize: 17 }}>{r.status === "failed" ? "이번 회차는 못 만들었어요" : r.title}</T>
                  <T v="caption" c={color.text4}>{meta(r, i)}</T>
                </Pressable>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
