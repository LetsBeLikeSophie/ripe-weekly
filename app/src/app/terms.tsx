// S_Terms: 이용약관 · 개인정보 처리방침 (전문은 법무 검토 후 교체. 지금은 요약본)
import { useState } from "react";
import { Pressable, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Screen, T, TopBar } from "../components/ui";
import { color, font, radius } from "../theme/tokens";
import { DOC_VERSION } from "../lib/api";

const DOCS = {
  terms: { label: "이용약관", body: [
    { h: "제1조 목적과 서비스", p: "Ripe Weekly는 적어 주신 관심 분야의 최근 글을 AI가 정기적으로 읽고 요약해 앱·카카오톡·메일로 보내 드리는 구독 서비스예요." },
    { h: "제2조 AI가 만든 내용", p: "리포트와 답변은 AI가 자동으로 만들어요. 틀리거나 오래된 내용이 있을 수 있어서 항목마다 출처를 붙여요. 투자·법률·의료 조언이 아니에요." },
    { h: "제3조 이용 나이", p: "만 14세 이상만 가입할 수 있어요." },
    { h: "제4조 체험과 구독", p: "7일 무료 체험이 끝나면 고른 요금제로 자동 결제돼요. 다음 결제일 24시간 전까지 스토어에서 해지하면 결제되지 않아요." },
    { h: "제5조 청약철회와 환불", p: "결제 후 7일 안이고 그 기간에 유료 리포트를 받지 않았다면 철회할 수 있어요. 환불은 결제한 스토어를 통해 처리돼요." },
  ] },
  privacy: { label: "개인정보 처리방침", body: [
    { h: "모으는 정보", p: "로그인 정보(카카오·구글), 리포트 요청 문장과 입장, 받을 요일·시간, 받은 리포트와 질문, 결제 확인 정보예요." },
    { h: "AI와 국외 이전", p: "리포트를 만들 때 요청 문장과 질문만 Anthropic(미국)에 보내요. 이름·메일·로그인 정보는 보내지 않아요." },
    { h: "선택 동의", p: "읽은 기록으로 맞추기, 내 상황 기억하기, 이름 없이 통계에 보태기는 리포트를 더 정확하게 만드는 데만 써요. 광고에는 쓰지 않아요." },
    { h: "보관과 파기", p: "탈퇴하면 바로 지워요. 결제 기록만 법에 따라 5년 보관해요." },
    { h: "내 권리", p: "프로필 → 내 데이터에서 언제든 보기·내려받기·지우기를 할 수 있어요." },
  ] },
} as const;

export default function Terms() {
  const { tab: t0 } = useLocalSearchParams<{ tab?: "terms" | "privacy" }>();
  const [tab, setTab] = useState<"terms" | "privacy">(t0 === "privacy" ? "privacy" : "terms");
  const d = DOCS[tab];
  return (
    <Screen scroll top={<TopBar title="약관" label="돌아가기" />}>
      <View accessibilityRole="tablist" style={{ flexDirection: "row", gap: 6, backgroundColor: color.white, borderRadius: radius.pill, padding: 4 }}>
        {(Object.keys(DOCS) as ("terms" | "privacy")[]).map((k) => (
          <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: tab === k }} onPress={() => setTab(k)}
            style={{ flex: 1, minHeight: 40, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: tab === k ? color.blue : "transparent" }}>
            <T v="smallBold" c={tab === k ? color.white : color.ink}>{DOCS[k].label}</T>
          </Pressable>
        ))}
      </View>
      <T v="caption" c={color.text4} style={{ marginTop: 12 }}>버전 {DOC_VERSION}</T>
      <View style={{ gap: 16, marginTop: 10 }}>
        {d.body.map((s) => (
          <View key={s.h} style={{ gap: 4 }}>
            <T v="bodyBold" style={{ fontFamily: font.bodyBold }}>{s.h}</T>
            <T v="small" c={color.text2} style={{ lineHeight: 22 }}>{s.p}</T>
          </View>
        ))}
      </View>
    </Screen>
  );
}
