// B11 리포트 설정: 켜기, 받는 날, AI 지시문(읽기 전용·복사), 말로 고치기, 바뀐 내역, 삭제
import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { IconButton, T, TextButton } from "../../../components/ui";
import { Icon } from "../../../components/Icon";
import { Switch } from "../../../components/Switch";
import { color, font, radius, space } from "../../../theme/tokens";
import { getTopic, listPromptVersions, PromptVersion, revertPrompt, Topic, updateTopic } from "../../../lib/api";
import { DAYS, hourLabel, makeCron, md, parseCron } from "../../../lib/format";

const HOURS = [7, 8, 12, 19];

export default function TopicSettings() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const inset = useSafeAreaInsets();
  const [t, setT] = useState<Topic | null>(null);
  const [log, setLog] = useState<PromptVersion[]>([]);
  const [whenOpen, setWhenOpen] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fix, setFix] = useState("");

  const load = useCallback(() => { getTopic(id).then(setT); listPromptVersions(id).then(setLog); }, [id]);
  useFocusEffect(load);
  if (!t) return <View style={{ flex: 1, backgroundColor: color.bg }} />;

  const c = parseCron(t.cron);
  const save = async (patch: Partial<Topic>) => { setT({ ...t, ...patch }); await updateTopic(id, patch as any); };
  const sel = (on: boolean) => ({ backgroundColor: on ? color.blue : color.white, borderColor: on ? color.blue : color.line });

  return (
    <View style={{ flex: 1, backgroundColor: color.bg, paddingTop: inset.top }}>
      <View style={{ paddingHorizontal: 16, minHeight: 52, justifyContent: "center" }}>
        <IconButton name="back" label="지난 리포트로" onPress={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.screenX, paddingTop: 6, paddingBottom: inset.bottom + 30, gap: 16 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <Text accessibilityRole="header" style={{ fontFamily: font.title, fontSize: 34, lineHeight: 38, color: t.enabled ? color.blue : "#9A9A9A", flex: 1 }}>{t.title}</Text>
          <Switch on={t.enabled} onChange={(v) => save({ enabled: v })} label={`${t.title} 리포트 켜기`} />
        </View>

        <View style={{ backgroundColor: color.white, borderRadius: radius.card }}>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: whenOpen }} onPress={() => setWhenOpen(!whenOpen)}
            style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 56, paddingHorizontal: 16 }}>
            <T v="bodyBold">{c.days.length === 7 ? "매일" : `매주 ${c.days.map((d) => DAYS[d]).join("·")}`} · {hourLabel(c.hour)}</T>
            <View style={{ transform: [{ rotate: whenOpen ? "180deg" : "0deg" }] }}><Icon name="chevronDown" size={20} stroke={color.text3} /></View>
          </Pressable>
          {whenOpen ? (
            <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {DAYS.map((d, i) => {
                  const on = c.days.includes(i);
                  return (
                    <Pressable key={d} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => {
                      const days = on ? c.days.filter((x) => x !== i) : [...c.days, i];
                      if (days.length) save({ cron: makeCron(days, c.hour, c.minute) });
                    }} style={[{ flex: 1, height: 40, borderRadius: 12, borderWidth: 2, alignItems: "center", justifyContent: "center" }, sel(on)]}>
                      <T v="smallBold" c={on ? color.white : color.ink}>{d}</T>
                    </Pressable>
                  );
                })}
              </View>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {HOURS.map((h) => {
                  const on = c.hour === h;
                  return (
                    <Pressable key={h} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => save({ cron: makeCron(c.days, h, 0) })}
                      style={[{ flex: 1, height: 40, borderRadius: 12, borderWidth: 2, alignItems: "center", justifyContent: "center" }, sel(on)]}>
                      <T v="caption" c={on ? color.white : color.ink} style={{ fontFamily: font.bodyBold }}>{hourLabel(h)}</T>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>

        <View style={{ backgroundColor: color.muted, borderRadius: radius.card, padding: 16, gap: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Icon name="lock" size={18} stroke={color.text3} />
              <T v="bodyBold">AI 지시문</T>
            </View>
            <View style={{ flexDirection: "row", gap: 4 }}>
              <IconButton name={promptOpen ? "eyeOff" : "eye"} label={promptOpen ? "지시문 숨기기" : "지시문 보기"} tone={promptOpen ? "solid" : "plain"} onPress={() => setPromptOpen(!promptOpen)} />
              <IconButton name={copied ? "check" : "copy"} label={copied ? "복사했어요" : "지시문 복사"} tone={copied ? "solid" : "plain"}
                onPress={async () => { await Clipboard.setStringAsync(t.prompt); setCopied(true); setTimeout(() => setCopied(false), 1600); }} />
            </View>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {t.summary_tags.map((g) => (
              <View key={g} style={{ backgroundColor: color.white, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}><T v="caption" style={{ fontFamily: font.bodyBold }}>{g}</T></View>
            ))}
          </View>
          {promptOpen ? (
            <View accessibilityLabel="AI 지시문 원문 (읽기 전용)" style={{ backgroundColor: color.white, borderRadius: 12, padding: 12 }}>
              <T v="caption" c={color.text2} style={{ lineHeight: 21 }}>{t.prompt}</T>
            </View>
          ) : null}
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput accessibilityLabel="말로 고치기" value={fix} onChangeText={setFix} placeholder="말로 고치기 · 예: 음료는 빼 줘" placeholderTextColor={color.text4}
            returnKeyType="send" onSubmitEditing={() => fix.trim() && router.push({ pathname: "/fix-preview", params: { id, text: fix.trim() } })}
            style={{ flex: 1, height: 52, borderWidth: 2, borderColor: color.line, borderRadius: radius.input, paddingHorizontal: 14, fontFamily: font.body, fontSize: 15, color: color.ink, backgroundColor: color.white }} />
          <Pressable accessibilityRole="button" accessibilityLabel={fix.trim() ? "고치기" : "말로 고치기 (음성)"} onPress={() => fix.trim() && router.push({ pathname: "/fix-preview", params: { id, text: fix.trim() } })}
            style={{ width: 52, height: 52, borderRadius: radius.input, backgroundColor: color.blue, alignItems: "center", justifyContent: "center" }}>
            <Icon name={fix.trim() ? "send" : "mic"} size={22} stroke={color.white} />
          </Pressable>
        </View>

        <View style={{ gap: 8 }}>
          <T v="bodyBold" c={color.text3}>바뀐 내역</T>
          <View style={{ backgroundColor: color.white, borderRadius: radius.card, paddingHorizontal: 16 }}>
            {log.map((l, i) => (
              <View key={l.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 52, borderBottomWidth: i < log.length - 1 ? 1 : 0, borderColor: color.divider }}>
                <T v="caption" c={color.text4} style={{ width: 40 }}>{md(l.created_at)}</T>
                <T v="smallBold" style={{ flex: 1 }}>{l.summary ?? l.reason}</T>
                {i < log.length - 1 ? (
                  <IconButton name="undo" label={`${l.summary ?? l.reason} 되돌리기`} iconColor={color.blue} onPress={async () => { await revertPrompt(id, log[i + 1].id); load(); }} />
                ) : null}
              </View>
            ))}
          </View>
        </View>

        <TextButton label="리포트 삭제" c={color.red} align="flex-start" onPress={() => router.push({ pathname: "/delete-topic", params: { id, title: t.title } })} />
      </ScrollView>
    </View>
  );
}
