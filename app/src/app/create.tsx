// B02 만들기: 한 줄 입력 + 예시, 막히면 많이 받는 주제
import { useEffect, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { router } from "expo-router";
import { BottomNav, Button, Chip, Hand, IconButton, Screen, Spacer, T, TextButton, Title } from "../components/ui";
import { Icon } from "../components/Icon";
import { color, font, radius } from "../theme/tokens";
import { createTopic, listTopics } from "../lib/api";
import { supabase } from "../lib/supabase";

const EXAMPLES = [
  "카페 창업 준비 중, 디저트·음료 트렌드",
  "쿠팡에서 생활용품 파는데, 요즘 뜰 만한 상품 아이디어",
  "대학원생, 배터리 소재 쪽 새 논문을 쉽게",
];
const POPULAR = ["디저트·카페", "잘 팔릴 상품", "AI 새 소식", "과학·연구", "릴스·숏폼", "부동산"];

export default function Create() {
  const [text, setText] = useState("");
  const [lost, setLost] = useState(false);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hasTopics, setHasTopics] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) listTopics().then((t) => setHasTopics(t.length > 0)).catch(() => {}); });
  }, []);

  const submit = async () => {
    if (!text.trim()) return;
    setBusy(true); setErr(null);
    const res = await createTopic(text.trim());
    setBusy(false);
    if (res.code === "limit") return router.push("/limit");
    if (res.error) return setErr(res.error);
    if (res.clarify) return router.push({ pathname: "/clarify", params: { request: text.trim(), question: res.clarify.question, options: JSON.stringify(res.clarify.options) } });
    if (res.topic) router.replace({ pathname: "/generating", params: { topicId: res.topic.id, first: hasTopics ? "0" : "1" } });
  };

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <Screen scroll footer={
        <>
          <View style={{ flexDirection: "row" }}><Button label={hasTopics ? "리포트 만들기" : "첫 리포트 받아 보기"} onPress={submit} loading={busy} disabled={!text.trim()} /></View>
          {!hasTopics ? <T v="caption" c={color.text3} style={{ textAlign: "center" }}>무료로 1번 받아 볼 수 있어요</T> : null}
        </>
      }>
        <View style={{ marginTop: 8, marginLeft: -10 }}>
          {hasTopics ? <View style={{ height: 44 }} /> : <IconButton name="back" label="뒤로" onPress={() => router.back()} />}
        </View>
        <View style={{ gap: 6 }}>
          <Hand lg>편하게 한 줄이면 돼요</Hand>
          <Title size="h1" color={color.ink}>{"어떤 트렌드가\n궁금하세요?"}</Title>
        </View>

        <View style={{ gap: 10 }}>
          <View>
            <TextInput accessibilityLabel="어떤 트렌드가 궁금한지 적기" value={text} onChangeText={setText} multiline
              placeholder="예: 카페 창업 준비 중인데 디저트랑 음료 트렌드가 궁금해요" placeholderTextColor={color.text4}
              style={{ minHeight: 100, borderWidth: 2, borderColor: color.blue, borderRadius: radius.card, paddingTop: 14, paddingBottom: 14, paddingLeft: 16, paddingRight: 64,
                fontFamily: font.body, fontSize: 16, lineHeight: 24, color: color.ink, backgroundColor: color.white, textAlignVertical: "top" }} />
            {/* 음성 입력: 실제 받아쓰기는 개발 빌드에서 음성 인식 모듈을 붙인다. 지금은 듣는 중 표시만. */}
            <Pressable accessibilityRole="button" accessibilityLabel={listening ? "말하기 멈추기" : "말로 입력하기"} accessibilityState={{ selected: listening }}
              onPress={() => setListening(!listening)}
              style={{ position: "absolute", right: 10, bottom: 10, width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: listening ? color.blue : color.blueSoft }}>
              <Icon name="mic" size={22} stroke={listening ? color.white : color.blue} />
            </Pressable>
          </View>
          {listening ? (
            <View accessibilityRole="text" style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: color.blue, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 }}>
              <T v="smallBold" c={color.white}>듣고 있어요… 편하게 말해 주세요</T>
            </View>
          ) : null}
        </View>

        <View style={{ gap: 10 }}>
          <T v="smallBold">이렇게 써 보세요</T>
          {EXAMPLES.map((e) => (
            <Pressable key={e} accessibilityRole="button" onPress={() => setText(e)}
              style={{ minHeight: 48, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1.5, borderStyle: "dashed", borderColor: color.blueLine, justifyContent: "center" }}>
              <T v="small">“{e}”</T>
            </Pressable>
          ))}
        </View>

        {!lost ? <TextButton label="뭘 써야 할지 모르겠어요" c={color.blue} align="flex-start" underline onPress={() => setLost(true)} /> : (
          <View style={{ gap: 10 }}>
            <T v="smallBold">요즘 많이 받아 보는 주제예요</T>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {POPULAR.map((p) => <Chip key={p} label={p} onPress={() => setText(p)} />)}
            </View>
          </View>
        )}
        {err ? <T v="small" c={color.red}>{err}</T> : null}
        <Spacer />
      </Screen>
      {hasTopics ? <BottomNav active="create" /> : null}
    </View>
  );
}
