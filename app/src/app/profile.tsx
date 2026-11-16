// B15 프로필: 요금제, 언어, 알림 받을 곳, 선택 동의, 데이터·약관, 로그아웃·탈퇴
import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckCircle, IconButton, InfoRows, LinkRows, T } from "../components/ui";
import { Switch } from "../components/Switch";
import { color, font, radius, space } from "../theme/tokens";
import { getConsents, getProfile, Profile, saveConsents, signOut, updateProfile } from "../lib/api";
import { supabase } from "../lib/supabase";

const LANG: Record<string, string> = { ko: "한국어", en: "English", ja: "日本語" };
const PLAN: Record<string, string> = { basic: "베이직 · 월 2,900원", plus: "플러스 · 월 5,900원", expired: "체험 끝남" };
const CH = [{ id: "app", name: "앱 알림" }, { id: "kakao", name: "카카오톡" }, { id: "email", name: "이메일" }] as const;
const OPT = [
  { id: "personalize_from_activity", title: "읽은 기록으로 맞추기", off: "피드백으로만 맞춰요" },
  { id: "remember_context", title: "내 상황 기억하기", off: "새 리포트마다 다시 물어봐요" },
  { id: "aggregate_quality", title: "이름 없이 통계에 보태기", off: "통계에서 빠져요" },
];

export default function ProfileScreen() {
  const inset = useSafeAreaInsets();
  const [p, setP] = useState<Profile | null>(null);
  const [cons, setCons] = useState<Record<string, boolean>>({});
  const [who, setWho] = useState({ name: "", provider: "", kakao: false, email: false });

  useFocusEffect(useCallback(() => {
    getProfile().then(setP);
    getConsents().then(setCons);
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user; const ids = u?.identities?.map((i) => i.provider) ?? [];
      setWho({ name: (u?.user_metadata?.name ?? u?.user_metadata?.full_name ?? "") as string, provider: ids.includes("kakao") ? "카카오" : ids.includes("google") ? "구글" : "", kakao: ids.includes("kakao"), email: !!u?.email });
    });
  }, []));

  const days = p?.plan === "trial" && p.trial_ends_at ? Math.max(0, Math.ceil((+new Date(p.trial_ends_at) - Date.now()) / 86400000)) : 0;
  const toggleCh = async (id: string, on: boolean) => {
    if (!p) return;
    const linked = id === "app" || (id === "kakao" ? who.kakao && cons.kakao_message : who.email && p.channels.includes("email"));
    if (on && id !== "app" && !linked) return router.push({ pathname: "/connect", params: { ch: id } });
    const channels = on ? [...new Set([...p.channels, id])] : p.channels.filter((c) => c !== id);
    setP({ ...p, channels }); await updateProfile({ channels });
  };
  const toggleOpt = async (id: string, on: boolean) => { setCons({ ...cons, [id]: on }); await saveConsents([{ kind: id, agreed: on }]); };

  return (
    <View style={{ flex: 1, backgroundColor: color.bg, paddingTop: inset.top }}>
      <View style={{ paddingHorizontal: 16, minHeight: 52, justifyContent: "center" }}>
        <IconButton name="close" label="닫기" onPress={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.screenX, paddingBottom: inset.bottom + 30, gap: 18 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: color.blue, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: font.title, fontSize: 24, color: color.white }}>{(who.name || "R").slice(0, 1)}</Text>
          </View>
          <View style={{ gap: 2 }}>
            <Text style={{ fontFamily: font.title, fontSize: 24, color: color.ink }}>{who.name ? `${who.name}님` : "반가워요"}</Text>
            <T v="caption" c={color.text4}>{who.provider ? `${who.provider}로 로그인` : "로그인 전"}{p?.country ? ` · ${p.country === "KR" ? "한국" : p.country}` : ""}</T>
          </View>
        </View>

        <InfoRows rows={[
          { k: "요금제", v: p?.plan === "trial" ? `무료 체험 · ${days}일 남음` : PLAN[p?.plan ?? ""] ?? "", onPress: () => router.push("/paywall") },
          { k: "언어", v: LANG[p?.language ?? "ko"] ?? p?.language, onPress: () => router.push("/language") },
        ]} />

        <View style={{ gap: 8 }}>
          <T v="bodyBold" c={color.text3}>새 리포트 알림 받을 곳</T>
          <View style={{ backgroundColor: color.white, borderRadius: radius.card, paddingHorizontal: 16 }}>
            {CH.map((c, i) => {
              const on = !!p?.channels.includes(c.id);
              return (
                <Pressable key={c.id} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={`${c.name}로 알림 받기`} onPress={() => toggleCh(c.id, !on)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, borderBottomWidth: i < CH.length - 1 ? 1 : 0, borderColor: color.divider }}>
                  <T v="bodyBold" style={{ flex: 1 }}>{c.name}</T>
                  {c.id !== "app" && !(c.id === "kakao" ? who.kakao : who.email) ? <T v="caption" c={color.blue} style={{ fontFamily: font.bodyBold }}>연결</T> : <CheckCircle on={on} size={32} />}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
            <T v="bodyBold" c={color.text3}>리포트를 더 정확하게 (선택)</T>
            <T v="caption" c={color.text4}>광고엔 안 써요</T>
          </View>
          <View style={{ backgroundColor: color.white, borderRadius: radius.card, paddingHorizontal: 16 }}>
            {OPT.map((o, i) => {
              const on = !!cons[o.id];
              return (
                <View key={o.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 64, borderBottomWidth: i < OPT.length - 1 ? 1 : 0, borderColor: color.divider }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <T v="bodyBold">{o.title}</T>
                    <T v="caption" c={color.text4}>끄면 · {o.off}</T>
                  </View>
                  <Switch on={on} onChange={(v) => toggleOpt(o.id, v)} label={o.title} />
                </View>
              );
            })}
          </View>
        </View>

        <LinkRows rows={[
          { label: "기억하는 내 상황 보기·지우기", onPress: () => router.push("/memory") },
          { label: "내 데이터 보기·내려받기", onPress: () => router.push("/my-data") },
          { label: "약관·개인정보 처리방침", onPress: () => router.push("/terms") },
        ]} />
        <LinkRows rows={[
          { label: "로그아웃", onPress: async () => { await signOut(); router.dismissAll(); router.replace("/welcome"); } },
          { label: "탈퇴하기", danger: true, onPress: () => router.push("/withdraw") },
        ]} />
      </ScrollView>
    </View>
  );
}
