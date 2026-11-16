// S_FixPreview: 말로 고치기 → 바뀌는 내용 미리 보기 → 적용
import { useEffect, useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Sheet } from "../components/Sheet";
import { ButtonPair, InfoRows, T } from "../components/ui";
import { color, font, radius } from "../theme/tokens";
import { applyFix, FixPreview, previewFix } from "../lib/api";
import { monthDay } from "../lib/format";

const KIND = { remove: "빼요", add: "더해요", keep: "그대로" } as const;

export default function FixPreviewSheet() {
  const { id, text } = useLocalSearchParams<{ id: string; text: string }>();
  const [p, setP] = useState<(FixPreview & { error?: string }) | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { previewFix(id, text).then(setP); }, [id, text]);

  return (
    <Sheet title="이렇게 고칠게요" footer={
      <ButtonPair label="적용" disabled={!p || !!p.error || busy} onCancel={() => router.back()} onPress={async () => {
        if (!p) return;
        setBusy(true);
        try { await applyFix(id, p.preview_id); router.back(); } catch { setBusy(false); }
      }} />
    }>
      <T v="bodyBold" c={color.blue}>"{text}"</T>
      {!p ? <T c={color.text4}>바뀌는 내용을 정리하고 있어요…</T> : p.error ? <T c={color.red}>{p.error}</T> : (
        <InfoRows rows={[
          ...p.changes.map((c) => ({ k: KIND[c.kind], v: c.text })),
          { k: "언제", v: p.from_date ? `다음 리포트부터 (${monthDay(p.from_date)})` : "다음 리포트부터" },
        ]} />
      )}
    </Sheet>
  );
}
