// B03 만드는 중: 리포트를 돌리고 끝날 때까지 기다린다 (앱을 닫아도 서버에서 계속 만든다)
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Brand, Button, Card, Hand, ProgressBar, Screen, Spacer, T, TextButton, Title } from "../components/ui";
import { RipeMark } from "../components/RipeMark";
import { Icon } from "../components/Icon";
import { color } from "../theme/tokens";
import { getReport, isAnonymous, runTopic } from "../lib/api";

const EXPECT_MS = 80_000; // 첫 조사 평균 시간
const STEPS = ["국내 뉴스·SNS 찾아보기", "해외에서 넘어오는 것 확인하기", "3분 분량으로 정리하기"];

export default function Generating() {
  const { topicId, first } = useLocalSearchParams<{ topicId: string; first?: string }>();
  const [progress, setProgress] = useState(0.04);
  const [reportId, setReportId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [anon, setAnon] = useState(false);
  const started = useRef(Date.now());

  useEffect(() => { isAnonymous().then(setAnon); }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await runTopic(topicId);
      if (!alive) return;
      if (r.code === "trial_expired") return router.replace("/trial-end");
      if (!r.report_id) return setErr(r.error ?? "리포트를 시작하지 못했어요");
      setReportId(r.report_id);
    })();
    return () => { alive = false; };
  }, [topicId]);

  useEffect(() => {
    if (!reportId) return;
    const t = setInterval(async () => {
      const elapsed = Date.now() - started.current;
      setProgress(Math.min(0.95, 0.04 + 0.91 * (1 - Math.exp(-elapsed / (EXPECT_MS / 2)))));
      const rep = await getReport(reportId);
      if (rep && (rep.status === "succeeded" || rep.status === "failed")) {
        clearInterval(t);
        setProgress(1);
        router.replace({ pathname: "/report/[id]", params: { id: reportId, first: first ?? "0" } });
      }
    }, 3000);
    return () => clearInterval(t);
  }, [reportId, first]);

  const step = progress < 0.4 ? 0 : progress < 0.8 ? 1 : 2;
  const leftSec = Math.max(10, Math.round(((1 - progress) * EXPECT_MS) / 1000 / 10) * 10);

  return (
    <Screen footer={anon ? <TextButton label="다 되면 알려 주세요" c={color.blue} onPress={() => router.push("/login")} /> : undefined}>
      <Brand />
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 8 }}>
        <Title>{first === "1" ? "첫 리포트\n만드는 중" : "리포트\n만드는 중"}</Title>
        <RipeMark size={76} speed={1800} />
      </View>

      <Card style={{ gap: 10 }}>
        <ProgressBar value={progress} label="리포트 만드는 중" />
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <T v="smallBold" c={color.blue}>읽고 정리하는 중</T>
          <T v="smallBold" c={color.blue}>{Math.round(progress * 100)}%</T>
        </View>
        <T v="caption" c={color.text3}>{leftSec}초쯤 남았어요 · 앱을 닫아도 계속 만들어요</T>
      </Card>

      <View style={{ gap: 10 }}>
        {STEPS.map((s, i) => (
          <View key={s} style={{ flexDirection: "row", alignItems: "center", gap: 10, opacity: i > step ? 0.45 : 1 }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: i < step ? color.blue : color.white, borderWidth: i < step ? 0 : 2, borderColor: i === step ? color.blue : color.line }}>
              {i < step ? <Icon name="check" size={14} stroke={color.white} width={2.6} /> : null}
            </View>
            <T v={i === step ? "bodyBold" : "body"}>{i === step ? `${s}…` : s}</T>
          </View>
        ))}
      </View>

      <Card tone="soft" style={{ gap: 4 }}>
        <Hand>기다리는 동안</Hand>
        <T v="small" c={color.text2}>리포트가 오면 항목마다 출처 링크가 붙어 있어요. 궁금한 건 리포트 아래에서 바로 물어볼 수 있어요.</T>
      </Card>

      {err ? (
        <View style={{ gap: 8 }}>
          <T v="small" c={color.red}>{err}</T>
          <View style={{ flexDirection: "row" }}><Button kind="secondary" label="리포트로 가기" onPress={() => router.replace("/home")} /></View>
        </View>
      ) : null}
      <Spacer />
    </Screen>
  );
}
