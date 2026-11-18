// B07 리포트 탭 (없으면 S_Empty, 연결이 끊기면 S_Offline 알림)
import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomNav, Button, Chip, Hand, IconTile, ProgressBar, T, Title } from "../components/ui";
import { Icon } from "../components/Icon";
import { SwipeRow } from "../components/SwipeRow";
import { RipeMarkSolid } from "../components/RipeMark";
import { supabase } from "../lib/supabase";
import { color, font, radius, space } from "../theme/tokens";
import { getProfile, listReports, listTopics, Profile, Report, Topic } from "../lib/api";
import { monthDay, scheduleLabel } from "../lib/format";

const POPULAR = ["디저트·카페", "잘 팔릴 상품", "AI 새 소식", "릴스·숏폼"];

export default function Home() {
  const inset = useSafeAreaInsets();
  const [topics, setTopics] = useState<Topic[] | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initial, setInitial] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, r, p] = await Promise.all([listTopics(), listReports(), getProfile()]);
      setTopics(t); setReports(r); setProfile(p); setOffline(false);
      const { data: u } = await supabase.auth.getUser();
      const name = (u.user?.user_metadata?.name ?? u.user?.user_metadata?.full_name ?? "") as string;
      setInitial(name.trim().slice(0, 1));
    } catch { setOffline(true); setTopics((x) => x ?? []); }
    setLoading(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const unread = reports.filter((r) => r.status === "succeeded" && !r.is_read);
  const latest = (tid: string) => reports.find((r) => r.topic_id === tid);
  const trialDays = profile?.plan === "trial" && profile.trial_ends_at ? Math.max(0, Math.ceil((+new Date(profile.trial_ends_at) - Date.now()) / 86400000)) : null;

  return (
    <View style={{ flex: 1, backgroundColor: color.bg, paddingTop: inset.top }}>
      <View style={{ paddingHorizontal: space.screenX, flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 52 }}>
        <T v="label">RIPE WEEKLY</T>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {trialDays != null ? (
            <Pressable accessibilityRole="link" onPress={() => router.push("/paywall")} style={{ borderWidth: 1.5, borderColor: color.blue, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
              <T v="micro" style={{ fontFamily: font.bodyBold }}>무료 체험 {trialDays}일 남음</T>
            </Pressable>
          ) : null}
          <Pressable accessibilityRole="link" accessibilityLabel="프로필" onPress={() => router.push("/profile")} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: color.blue, alignItems: "center", justifyContent: "center" }}>
              {initial ? <Text style={{ fontFamily: font.title, fontSize: 16, color: color.white }}>{initial}</Text> : <RipeMarkSolid size={18} />}
            </View>
          </Pressable>
        </View>
      </View>

      {offline ? (
        <View accessibilityRole="alert" style={{ marginHorizontal: space.screenX, marginTop: 6, backgroundColor: color.ink, borderRadius: radius.pill, paddingLeft: 16, paddingRight: 4, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Icon name="wifiOff" size={18} stroke={color.white} />
          <T v="small" c={color.white} style={{ flex: 1 }} lines={1}>인터넷이 끊겼어요</T>
          <Pressable accessibilityRole="button" accessibilityLabel="다시 연결" onPress={load} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" }}>
            <Icon name="refresh" size={18} stroke={color.white} />
          </Pressable>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={{ paddingHorizontal: space.screenX, paddingTop: 10, paddingBottom: 16, gap: 22, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={color.blue} />}>
        {topics && topics.length === 0 && !offline ? (
          // ---- 아직 없음 (S_Empty) ----
          <View style={{ gap: 16, paddingTop: 8 }}>
            <Title>{"아직 받는\n리포트가 없어요."}</Title>
            <T c={color.text3}>궁금한 걸 한 줄만 적으면, 매주 읽고 정리해 드려요.</T>
            <View style={{ flexDirection: "row" }}><Button label="첫 리포트 만들기" icon={<Icon name="plus" size={18} stroke={color.white} width={2.4} />} onPress={() => router.push("/create")} /></View>
            <View style={{ gap: 8, marginTop: 6 }}>
              <Hand>요즘 많이 받는 것</Hand>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {POPULAR.map((p) => <Chip key={p} label={p} onPress={() => router.push("/create")} />)}
              </View>
            </View>
          </View>
        ) : (
          <>
            {unread.length ? (
              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
                  <Text accessibilityRole="header" style={{ fontFamily: font.title, fontSize: 28 }}>안 읽은 리포트</Text>
                  <T v="bodyBold" c={color.blue}>{unread.length}</T>
                </View>
                {unread.map((r) => {
                  const t = topics?.find((x) => x.id === r.topic_id);
                  return (
                    <Pressable key={r.id} accessibilityRole="link" accessibilityLabel={`안 읽음. ${t?.title}. ${r.title}`} onPress={() => router.push({ pathname: "/report/[id]", params: { id: r.id } })}
                      style={{ backgroundColor: color.blue, borderRadius: radius.cardLg, paddingVertical: 18, paddingRight: 18, paddingLeft: 34, gap: 6 }}>
                      <View style={{ position: "absolute", left: 16, top: 24, width: 9, height: 9, borderRadius: 5, backgroundColor: "#FFD8A8" }} />
                      <T v="caption" c={color.white} style={{ fontFamily: font.bodyBold, opacity: 0.92 }}>{t?.title} · {monthDay(r.finished_at ?? r.created_at)}</T>
                      <Text style={{ fontFamily: font.title, fontSize: 26, lineHeight: 29, color: color.white }}>{r.title}</Text>
                      <T v="micro" c={color.white} style={{ opacity: 0.9 }}>3분이면 다 봐요</T>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            <View style={{ gap: 10 }}>
              <T v="bodyBold" c={color.text3}>내 리포트</T>
              <View style={{ backgroundColor: color.white, borderRadius: radius.cardLg, overflow: "hidden" }}>
                {(topics ?? []).map((t, i) => {
                  const r = latest(t.id);
                  const running = r?.status === "running";
                  const pct = running && r?.started_at ? Math.min(95, Math.round(((Date.now() - +new Date(r.started_at)) / 80000) * 100)) : 0;
                  return (
                    <SwipeRow key={t.id} label={t.title} onDelete={() => router.push({ pathname: "/delete-topic", params: { id: t.id, title: t.title } })}>
                      <Pressable accessibilityRole="link" onPress={() => router.push({ pathname: "/topic/[id]", params: { id: t.id } })}
                        style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 72, paddingHorizontal: 14, borderBottomWidth: i < (topics?.length ?? 0) - 1 ? 1 : 0, borderColor: color.divider }}>
                        <View style={{ opacity: t.enabled ? 1 : 0.6 }}><IconTile icon={t.icon} title={t.title} size={42} /></View>
                        <View style={{ flex: 1, gap: running ? 5 : 2 }}>
                          <T v="bodyBold" c={t.enabled ? color.ink : color.text3} style={{ fontSize: 16 }}>{t.title}</T>
                          {running ? (
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                              <View style={{ flex: 1, maxWidth: 140 }}><ProgressBar value={pct / 100} label="이번 주 리포트 만드는 중" /></View>
                              <T v="caption" c={color.blue} style={{ fontFamily: font.bodyBold }}>만드는 중 {pct}%</T>
                            </View>
                          ) : (
                            <T v="caption" c={t.enabled ? color.text3 : color.text4}>{t.enabled ? `${scheduleLabel(t.cron).split(" · ")[0]} · 다음은 ${monthDay(t.next_run_at)}` : "쉬는 중"}</T>
                          )}
                        </View>
                        <Icon name="chevronRight" size={18} stroke={color.text4} />
                      </Pressable>
                    </SwipeRow>
                  );
                })}
              </View>
            </View>
          </>
        )}
      </ScrollView>
      <BottomNav active="reports" />
    </View>
  );
}
