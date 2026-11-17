// S_Share: 카카오톡 · 이메일 · 이미지 (카드 이미지를 사진에 저장)
import { ComponentRef, useEffect, useRef, useState } from "react";
import { Platform, Pressable, Share, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { captureRef } from "react-native-view-shot";
import * as MailComposer from "expo-mail-composer";
import * as MediaLibrary from "expo-media-library";
import { Sheet } from "../components/Sheet";
import { T } from "../components/ui";
import { color, font, radius } from "../theme/tokens";
import { getReport, getTopic, Report, Topic } from "../lib/api";
import { md } from "../lib/format";

// 공유 웹 보기(S_SharedWeb, https://ripe.itssophie.dev/r/<id>)는 아직 없다. 생기기 전엔 링크 대신 앱 주소만 붙인다.
const SITE = "https://ripe.itssophie.dev";

export default function ShareSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [r, setR] = useState<Report | null>(null);
  const [t, setT] = useState<Topic | null>(null);
  const [msg, setMsg] = useState("");
  const shot = useRef<ComponentRef<typeof View>>(null);
  useEffect(() => { getReport(id).then((x) => { setR(x); if (x) getTopic(x.topic_id).then(setT); }); }, [id]);

  const text = `${r?.title ?? ""}\n${r?.payload?.tldr ?? ""}\n\nRipe Weekly · ${SITE}`;
  const acts = [
    { id: "kakao", label: "카카오톡", mark: "K", bg: color.kakao, fg: color.kakaoInk,
      run: async () => { await Share.share({ message: text }); setMsg("카카오톡을 골라 보내 주세요"); } },
    { id: "mail", label: "이메일", mark: "@", bg: color.blueSoft, fg: color.blue,
      run: async () => {
        if (await MailComposer.isAvailableAsync()) { await MailComposer.composeAsync({ subject: `[${t?.title}] ${r?.title}`, body: text }); setMsg("메일 쓰기를 열었어요"); }
        else { await Share.share({ message: text }); }
      } },
    { id: "img", label: "이미지", mark: "□", bg: color.muted, fg: color.ink,
      run: async () => {
        if (Platform.OS === "web") {
          const uri = shot.current ? await captureRef(shot, { format: "png", quality: 1, result: "data-uri" }) : null;
          if (uri) { const a = document.createElement("a"); a.href = uri; a.download = "ripe-weekly.png"; a.click(); setMsg("카드 이미지를 내려받았어요"); }
          return;
        }
        const perm = await MediaLibrary.requestPermissionsAsync(true);
        if (!perm.granted) { setMsg("사진 저장을 허용해 주세요"); return; }
        const uri = shot.current ? await captureRef(shot, { format: "png", quality: 1 }) : null;
        if (uri) { await MediaLibrary.saveToLibraryAsync(uri); setMsg("카드 이미지를 사진에 저장했어요"); }
      } },
  ];
  const names = r?.payload?.items.slice(0, 3).map((i) => i.name).join(" · ") ?? "";

  return (
    <Sheet title="공유하기">
      <View ref={shot} collapsable={false} style={{ backgroundColor: color.blue, borderRadius: radius.cardLg, padding: 20, gap: 8 }}>
          <T v="micro" c={color.white} style={{ fontFamily: font.bodyBold, letterSpacing: 1, opacity: 0.9 }}>RIPE WEEKLY · {t?.title} · {md(r?.created_at)}</T>
          <Text style={{ fontFamily: font.title, fontSize: 28, lineHeight: 32, color: color.white }}>{r?.title}</Text>
          <T v="caption" c={color.white} style={{ opacity: 0.9 }}>{names}</T>
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {acts.map((a) => (
          <Pressable key={a.id} accessibilityRole="button" accessibilityLabel={`${a.label}로 공유`} onPress={a.run}
            style={{ flex: 1, alignItems: "center", gap: 8, paddingVertical: 14, backgroundColor: color.white, borderRadius: 16 }}>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: a.bg, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: a.fg }}>{a.mark}</Text>
            </View>
            <T v="caption" style={{ fontFamily: font.bodyBold }}>{a.label}</T>
          </Pressable>
        ))}
      </View>
      {msg ? <T v="caption" c={color.blue} style={{ textAlign: "center" }} >{msg}</T> : null}
    </Sheet>
  );
}
