// B09 리포트에 물어보기 (+ S_AskLimit: 이번 달 횟수를 다 쓴 상태)
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, ScrollViewInstance, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Card, Chip, IconButton, T } from "../../components/ui";
import { Icon } from "../../components/Icon";
import { color, font, radius, space } from "../../theme/tokens";
import { ask, askRemaining, AskMessage, getReport, listAsk, Report } from "../../lib/api";
import { monthDay } from "../../lib/format";

// **굵게** 만 지원하는 아주 작은 표시기 (답변은 서버에서 짧은 문단·목록으로 온다)
function Rich({ text, c }: { text: string; c: string }) {
  return (
    <Text style={{ fontFamily: font.body, fontSize: 15, lineHeight: 23, color: c }}>
      {text.split(/(\*\*[^*]+\*\*)/g).map((s, i) => s.startsWith("**") ? <Text key={i} style={{ fontFamily: font.bodyBold, color: color.blue }}>{s.slice(2, -2)}</Text> : s)}
    </Text>
  );
}

export default function Ask() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const inset = useSafeAreaInsets();
  const [r, setR] = useState<Report | null>(null);
  const [msgs, setMsgs] = useState<AskMessage[]>([]);
  const [left, setLeft] = useState<{ remaining: number; limit: number; resets_at: string } | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [sugg, setSugg] = useState<string[]>([]);
  const scroll = useRef<ScrollViewInstance>(null);

  useEffect(() => { getReport(id).then(setR); listAsk(id).then(setMsgs); askRemaining().then(setLeft); }, [id]);
  const subject = r?.payload?.items[0]?.name ?? r?.title ?? "";
  const out = left != null && left.remaining <= 0;

  const send = async (text: string) => {
    const t = text.trim(); if (!t || busy || out) return;
    setQ(""); setBusy(true); setSugg([]);
    setMsgs((m) => [...m, { id: "u" + Date.now(), role: "user", content: t, created_at: new Date().toISOString() }]);
    const res = await ask(id, t);
    if (res.code === "limit") setLeft((l) => l && { ...l, remaining: 0 });
    else if (res.error) setMsgs((m) => [...m, { id: "e" + Date.now(), role: "assistant", content: res.error!, created_at: "" }]);
    else {
      setMsgs((m) => [...m, { id: "a" + Date.now(), role: "assistant", content: res.answer ?? "", created_at: new Date().toISOString() }]);
      setLeft((l) => l && { ...l, remaining: res.remaining ?? l.remaining });
      setSugg(res.suggestions ?? []);
    }
    setBusy(false);
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: color.bg, paddingTop: inset.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, minHeight: 56 }}>
        <IconButton name="back" label="리포트로" onPress={() => router.back()} />
        <View style={{ flex: 1 }}>
          <T v="bodyBold" lines={1}>{subject} 리포트에 물어보기</T>
          <T v="caption" c={out ? color.red : color.blue} style={{ fontFamily: font.bodyBold }}>{left ? `이번 달 ${left.remaining}번 남았어요` : " "}</T>
        </View>
      </View>

      <ScrollView ref={scroll} contentContainerStyle={{ paddingHorizontal: space.screenX, paddingVertical: 12, gap: 14 }} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
        {msgs.map((m) => m.role === "user" ? (
          <View key={m.id} style={{ alignSelf: "flex-end", maxWidth: "84%", backgroundColor: color.blue, borderRadius: 20, borderBottomRightRadius: 6, paddingHorizontal: 16, paddingVertical: 12 }}>
            <T c={color.white}>{m.content}</T>
          </View>
        ) : (
          <View key={m.id} style={{ alignSelf: "stretch", gap: 6 }}>
            <T v="caption" c={color.blue} style={{ fontFamily: font.bodyBold }}>Ripe</T>
            <View style={{ backgroundColor: color.white, borderRadius: 20, borderTopLeftRadius: 6, padding: 16, gap: 8 }}>
              <Rich text={m.content} c={color.ink} />
              <T v="micro" c={color.text4}>이번 리포트 내용을 바탕으로 답했어요</T>
            </View>
          </View>
        ))}
        {busy ? <T v="caption" c={color.text4}>Ripe가 리포트를 다시 보고 있어요…</T> : null}
        {out ? (
          <Card tone="soft" style={{ gap: 6 }}>
            <T v="bodyBold">이번 달 물어보기를 다 썼어요</T>
            <T v="small" c={color.text3}>{monthDay(left?.resets_at)}에 {left?.limit}번이 다시 채워져요. 플러스는 한 달에 30번까지 물어볼 수 있어요.</T>
            <View style={{ flexDirection: "row", marginTop: 6 }}><Button label="요금제 보기" small onPress={() => router.push({ pathname: "/paywall", params: { plan: "plus" } })} /></View>
          </Card>
        ) : null}
      </ScrollView>

      {!out ? (
        <View style={{ paddingHorizontal: space.screenX, paddingBottom: Math.max(inset.bottom, 12) + 4, gap: 10 }}>
          {sugg.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {sugg.map((s) => <Chip key={s} label={s} onPress={() => send(s)} />)}
            </ScrollView>
          ) : null}
          <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
            <TextInput accessibilityLabel="질문 입력" value={q} onChangeText={setQ} placeholder="궁금한 걸 물어보세요" placeholderTextColor={color.text4} multiline
              style={{ flex: 1, minHeight: 52, maxHeight: 120, borderWidth: 2, borderColor: color.line, borderRadius: radius.input, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 12, fontFamily: font.body, fontSize: 15, color: color.ink, backgroundColor: color.white }} />
            <Pressable accessibilityRole="button" accessibilityLabel="보내기" disabled={!q.trim() || busy} onPress={() => send(q)}
              style={{ width: 52, height: 52, borderRadius: radius.input, backgroundColor: q.trim() && !busy ? color.blue : color.blueLine, alignItems: "center", justifyContent: "center" }}>
              <Icon name="send" size={22} stroke={color.white} />
            </Pressable>
          </View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
