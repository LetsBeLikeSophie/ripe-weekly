// B_Clarify: 엔진이 되물은 질문 하나 (선택지 3~4개)
import { useState } from "react";
import { Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Sheet } from "../components/Sheet";
import { Button, Hand, T, TextButton } from "../components/ui";
import { color } from "../theme/tokens";
import { createTopic } from "../lib/api";

export default function Clarify() {
  const p = useLocalSearchParams<{ request: string; question: string; options: string }>();
  const options: string[] = JSON.parse(p.options || "[]");
  const [pick, setPick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const go = async (answer: string) => {
    setBusy(true); setErr(null);
    const res = await createTopic(p.request, answer);
    setBusy(false);
    if (res.error || !res.topic) return setErr(res.error ?? "리포트를 만들지 못했어요");
    router.dismissAll();
    router.replace({ pathname: "/generating", params: { topicId: res.topic.id, first: "1" } });
  };

  return (
    <Sheet title={p.question}>
      <Hand style={{ marginTop: -8 }}>하나만 물어볼게요</Hand>
      <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
        {options.map((o, i) => {
          const on = i === pick;
          return (
            <Pressable key={o} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => setPick(i)}
              style={{ minHeight: 56, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, justifyContent: "center", borderWidth: 2, borderColor: on ? color.blue : color.line, backgroundColor: on ? color.blue : color.white }}>
              <T v="bodyBold" c={on ? color.white : color.ink} style={{ fontSize: 16 }}>{o}</T>
            </Pressable>
          );
        })}
      </View>
      {err ? <T v="small" c={color.red}>{err}</T> : null}
      <View style={{ flexDirection: "row" }}><Button label="확인" loading={busy} onPress={() => go(options[pick] ?? "")} /></View>
      <TextButton label="건너뛰기" onPress={() => go("잘 모르겠어요. 받아 보면서 맞출게요")} />
    </Sheet>
  );
}
