// B08 리포트 (새 항목이 없으면 B12 조용한 주, 실패하면 S_Fail)
import { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Card, Chip, Hand, IconButton, StageTag, T, Title, WeekBars } from "../../components/ui";
import { Icon } from "../../components/Icon";
import { TrendCurve } from "../../components/TrendCurve";
import { color, font, radius, space } from "../../theme/tokens";
import { getReport, getTopic, isAnonymous, ItemTrend, itemTrends, markRead, Report, runTopic, sendFeedback, Topic } from "../../lib/api";
import { md } from "../../lib/format";

const CHIPS = [
  ["good", "딱 좋아요"], ["too_long", "너무 길어요"], ["too_hard", "너무 어려워요"],
  ["deeper", "더 깊게 보고 싶어요"], ["known", "이미 아는 거예요"], ["not_me", "나랑 안 맞아요"],
] as const;
const SUGGEST = [
  ["wide", "범위 넓히기", "지금 주제 옆 분야까지 같이 봐요", "다음 리포트부터 범위를 넓혀 볼게요"],
  ["abroad", "해외 먼저 보기", "해외에서 뜨는 걸 국내보다 먼저 알려 드려요", "다음 리포트부터 해외도 먼저 볼게요"],
  ["slow", "2주에 한 번으로 줄이기", "조용한 분야라면 덜 자주, 더 꽉 차게 받아요", "2주에 한 번으로 바꿀게요"],
] as const;

export default function ReportScreen() {
  const { id, first } = useLocalSearchParams<{ id: string; first?: string }>();
  const inset = useSafeAreaInsets();
  const [rep, setRep] = useState<Report | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [trends, setTrends] = useState<Record<string, ItemTrend>>({});
  const [chips, setChips] = useState<Record<string, boolean>>({});
  const [sug, setSug] = useState<string | null>(null);
  const [anon, setAnon] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await getReport(id);
      setRep(r);
      if (!r) return;
      markRead(id);
      const [t, tr, a] = await Promise.all([getTopic(r.topic_id), itemTrends(r.topic_id), isAnonymous()]);
      setTopic(t); setTrends(tr); setAnon(a);
    })();
  }, [id]);

  if (!rep) return <View style={{ flex: 1, backgroundColor: color.bg }} />;
  const p = rep.payload;
  const items = p?.items ?? [];
  const head = `${topic?.title ?? ""} · ${md(rep.created_at)} · ${items.length ? 3 : 1}분`;

  const header = (
    <View style={{ paddingTop: inset.top + 4, paddingHorizontal: 16, paddingBottom: 6, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <IconButton name="back" label="받은 리포트로" onPress={() => (router.canGoBack() ? router.back() : router.replace("/home"))} />
      <T v="label" style={{ flexShrink: 1, textAlign: "center" }} lines={1}>{head}</T>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {rep.status === "succeeded" ? <IconButton name="share" label="이 리포트 공유하기" onPress={() => router.push({ pathname: "/share", params: { id } })} /> : null}
        {rep.status === "succeeded" ? <IconButton name="chat" tone="soft" label="이 리포트에 물어보기" onPress={() => router.push({ pathname: "/ask/[id]", params: { id } })} /> : <View style={{ width: 44 }} />}
      </View>
    </View>
  );

  // ---- 못 만들었을 때 (S_Fail) ----
  if (rep.status === "failed") {
    const retry = async () => {
      setRetrying(true);
      const r = await runTopic(rep.topic_id);
      if (r.report_id) router.replace({ pathname: "/generating", params: { topicId: rep.topic_id } });
      else setRetrying(false);
    };
    return (
      <View style={{ flex: 1, backgroundColor: color.bg }}>
        {header}
        <View style={{ flex: 1, paddingHorizontal: space.screenX, gap: 14, paddingBottom: inset.bottom + 24 }}>
          <Title>{"이번 리포트를\n못 만들었어요."}</Title>
          <Card>
            <T>글을 모으다가 연결이 끊겼어요. <Text style={{ fontFamily: font.bodyBold }}>1시간 뒤에 알아서 다시</Text> 해 볼게요.</T>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Icon name="check" size={16} stroke={color.text3} width={2.6} />
              <T v="caption" c={color.text3}>못 만든 회차는 횟수에 안 세요</T>
            </View>
          </Card>
          <View style={{ flexGrow: 1 }} />
          <View style={{ flexDirection: "row" }}><Button label="지금 다시 해 보기" icon={<Icon name="refresh" size={18} stroke={color.white} />} loading={retrying} onPress={retry} /></View>
          <View style={{ flexDirection: "row" }}><Button kind="secondary" label="지난 리포트 보기" onPress={() => router.replace({ pathname: "/topic/[id]", params: { id: rep.topic_id } })} /></View>
        </View>
      </View>
    );
  }

  const feedback = (key: string) => {
    const on = !chips[key];
    setChips({ ...chips, [key]: on });
    if (on) sendFeedback(id, key);
  };

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      {header}
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.screenX, paddingTop: 6, paddingBottom: inset.bottom + 40, gap: 16 }}>
        {p?.quiet ? (
          // ---- 조용한 주 (B12) ----
          <>
            <Title>{"이번 주는\n조용해요."}</Title>
            <Card style={{ gap: 12 }}>
              <T>그래도 이번 주 <Text style={{ fontFamily: font.bodyBold }}>글 {rep.docs_read ?? 0}개</Text>, <Text style={{ fontFamily: font.bodyBold }}>출처 {rep.sources_count ?? 0}곳</Text>을 다 읽었어요. 새로 뜬 건 없었어요.</T>
              {p.tldr ? <T v="small" c={color.text2}>{p.tldr}</T> : null}
            </Card>
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
                <Text style={{ fontFamily: font.title, fontSize: 22 }}>이렇게 바꿔 볼까요?</Text>
                <T v="micro" c={color.text4}>눌러서 고르기</T>
              </View>
              {SUGGEST.map(([k, title, desc]) => {
                const on = sug === k;
                return (
                  <Pressable key={k} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => { setSug(k); sendFeedback(id, `suggest:${k}`, "text"); }}
                    style={{ padding: 14, borderRadius: radius.card, borderWidth: 2, borderColor: on ? color.blue : color.line, backgroundColor: on ? color.blue : color.white, gap: 2 }}>
                    <T v="bodyBold" c={on ? color.white : color.ink}>{title}</T>
                    <T v="caption" c={on ? color.white : color.text3}>{desc}</T>
                  </Pressable>
                );
              })}
              {sug ? <Status text={SUGGEST.find((s) => s[0] === sug)![3]} /> : null}
            </View>
          </>
        ) : (
          <>
            <Text accessibilityRole="header" style={{ fontFamily: font.title, fontSize: 48, lineHeight: 51, color: color.blue }}>{p?.headline}</Text>

            <View style={{ backgroundColor: color.white, borderRadius: radius.card, padding: 16, borderWidth: 2, borderColor: color.blue, gap: 6 }}>
              <Hand style={{ fontSize: 24 }}>바쁘면 이것만</Hand>
              <T v="bodyBold" style={{ fontSize: 16, lineHeight: 26 }}>{p?.tldr}</T>
            </View>

            <ReadVolume rep={rep} />

            {items.some((it) => trends[it.name]?.pos != null) ? (
              <Card style={{ gap: 6 }}>
                <T v="bodyBold">지금 어디쯤일까</T>
                <TrendCurve items={items.filter((it) => trends[it.name]?.pos != null).map((it) => ({ name: it.name, stage: it.stage, pos: trends[it.name]!.pos! }))} />
              </Card>
            ) : null}

            {items.map((it) => {
              const bars = trends[it.name]?.mentions ?? [];
              return (
                <View key={it.name} style={{ backgroundColor: color.white, borderRadius: radius.card, padding: 16, gap: 10 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <Text accessibilityRole="header" style={{ fontFamily: font.title, fontSize: 22, flexShrink: 1 }}>{it.name}</Text>
                    <StageTag stage={it.stage} />
                  </View>
                  {bars.length > 1 ? (
                    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 12 }}>
                      <WeekBars values={bars} stage={it.stage} />
                      <T v="micro" c={color.text4}>{`지난 ${bars.length}주\n언급 흐름`}</T>
                    </View>
                  ) : null}
                  <T v="small" c={color.text2} style={{ lineHeight: 22 }}>{it.desc}</T>
                  {it.angle || it.term ? (
                    <View style={{ backgroundColor: color.bg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 4 }}>
                      {it.angle ? <T v="caption">{it.angle}</T> : null}
                      {it.term ? <T v="caption"><Text style={{ fontFamily: font.bodyBold }}>{it.term.word}</Text> = {it.term.meaning}</T> : null}
                    </View>
                  ) : null}
                  {it.link ? (
                    <Pressable accessibilityRole="link" onPress={() => Linking.openURL(it.link!)}>
                      <T v="micro" c={color.text4}>출처 {it.sources.length}곳 · {it.sources[0]?.title ?? ""} <Text style={{ fontFamily: font.bodyBold, color: color.blue }}>보기 →</Text></T>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}

            {p?.watch_next ? (
              <View style={{ borderWidth: 2, borderStyle: "dashed", borderColor: color.blue, borderRadius: radius.card, padding: 16, gap: 6 }}>
                <Hand style={{ fontSize: 24 }}>다음에 지켜볼 것</Hand>
                <T v="small" style={{ lineHeight: 22 }}>{p.watch_next}</T>
              </View>
            ) : null}
          </>
        )}

        <T v="micro" c={color.text4} style={{ lineHeight: 19 }}>AI가 공개된 자료를 읽고 정리한 리포트예요. 틀린 내용이 있을 수 있어요. 투자·창업 조언이 아니에요.</T>

        <View style={{ borderTopWidth: 2, borderColor: color.ink, paddingTop: 18, gap: 10 }}>
          <Text style={{ fontFamily: font.title, fontSize: 22 }}>이번 리포트 어땠어요?</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {CHIPS.map(([k, label]) => <Chip key={k} label={label} on={!!chips[k]} onPress={() => feedback(k)} />)}
          </View>
          {Object.values(chips).some(Boolean) ? <Status text="다음 리포트부터 반영할게요" /> : null}
        </View>

        <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/ask/[id]", params: { id } })}
          style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: color.white, borderRadius: radius.card, padding: 16 }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: color.blueSoft, alignItems: "center", justifyContent: "center" }}><Icon name="chat" size={20} stroke={color.blue} /></View>
          <View style={{ flex: 1 }}>
            <T v="bodyBold">더 궁금한 게 있어요</T>
            <T v="caption" c={color.text3}>예: 우리 가게에 맞을까?</T>
          </View>
        </Pressable>

        {anon || first === "1" ? (
          <View style={{ backgroundColor: color.blue, borderRadius: 22, padding: 20, gap: 10 }}>
            <Text style={{ fontFamily: font.title, fontSize: 24, lineHeight: 29, color: color.white }}>{"이 주제, 매주\n새로 받아 볼까요?"}</Text>
            <T v="small" c={color.white} style={{ lineHeight: 22 }}>매주 다시 읽고 지난주와 비교해서 보내 드려요. 7일 동안 무료고, 결제는 체험이 끝날 때 정하면 돼요.</T>
            <Pressable accessibilityRole="button" onPress={() => router.push("/login")}
              style={{ marginTop: 4, height: 52, borderRadius: radius.pill, backgroundColor: color.white, alignItems: "center", justifyContent: "center" }}>
              <T v="bodyBold" c={color.blue} style={{ fontSize: 16 }}>매주 받기 시작</T>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Status({ text }: { text: string }) {
  return (
    <View accessibilityRole="alert" style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Icon name="check" size={16} stroke={color.blue} width={2.6} />
      <T v="caption" c={color.blue} style={{ fontFamily: font.bodyBold }}>{text}</T>
    </View>
  );
}

// "이번에 글 N개, 출처 N곳을 읽었어요" + 출처 종류 막대
function ReadVolume({ rep }: { rep: Report }) {
  const b = rep.source_breakdown ?? {};
  const parts = [["news", "뉴스", "#2F5FB3"], ["sns", "SNS", "#7FA0DC"], ["overseas", "해외", "#C9935C"], ["other", "기타", "#C9C9C2"]]
    .map(([k, label, c]) => ({ label, c, n: Number(b[k] ?? 0) })).filter((x) => x.n > 0);
  const total = parts.reduce((a, x) => a + x.n, 0);
  return (
    <Card style={{ gap: 10 }}>
      <T>이번에 <Text style={{ fontFamily: font.bodyBold, color: color.blue }}>글 {rep.docs_read ?? 0}개</Text>, <Text style={{ fontFamily: font.bodyBold, color: color.blue }}>출처 {rep.sources_count ?? 0}곳</Text>을 읽었어요</T>
      {total > 0 ? (
        <>
          <View accessibilityLabel={parts.map((x) => `${x.label} ${x.n}`).join(", ")} style={{ flexDirection: "row", height: 14, borderRadius: radius.pill, overflow: "hidden", gap: 2 }}>
            {parts.map((x) => <View key={x.label} style={{ flex: x.n, backgroundColor: x.c }} />)}
          </View>
          <View style={{ flexDirection: "row", gap: 14 }}>
            {parts.map((x) => (
              <View key={x.label} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: x.c }} />
                <T v="micro" c="#444444">{x.label} {x.n}</T>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </Card>
  );
}
