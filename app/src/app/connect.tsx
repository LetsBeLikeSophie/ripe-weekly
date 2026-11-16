// B15 안의 시트: 카카오톡·이메일로 알림 받기 연결
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Sheet } from "../components/Sheet";
import { ButtonPair, T } from "../components/ui";
import { color } from "../theme/tokens";
import { getProfile, updateProfile } from "../lib/api";
import { loginWith } from "../lib/auth";

export default function Connect() {
  const { ch } = useLocalSearchParams<{ ch: "kakao" | "email" }>();
  const [busy, setBusy] = useState(false);
  const kakao = ch === "kakao";
  const enable = async () => {
    const p = await getProfile();
    const set = new Set(p?.channels ?? []); set.add(ch);
    await updateProfile({ channels: [...set] });
  };
  return (
    <Sheet title={kakao ? "카카오톡으로도 받기" : "이메일로도 받기"} footer={
      <ButtonPair cancel="나중에" label={kakao ? "카카오 연결" : "확인 메일 보내기"} disabled={busy} onCancel={() => router.back()} onPress={async () => {
        setBusy(true);
        try {
          if (kakao) { const r = await loginWith("kakao", { improve: true }); if (r !== "ok") return router.replace("/login-fail"); }
          await enable(); router.back();
        } finally { setBusy(false); }
      }} />
    }>
      <T c={color.text3}>{kakao
        ? "카카오 계정을 연결하고 메시지 받기에 동의하면, 새 리포트가 \"나와의 채팅\"으로 와요."
        : "로그인한 메일로 확인 메일을 보내요. 메일 안의 버튼을 누르면 새 리포트가 메일로도 와요."}</T>
    </Sheet>
  );
}
