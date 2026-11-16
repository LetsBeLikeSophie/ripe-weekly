// S_Language: 언어 고르기 (앱 화면과 앞으로 오는 리포트 언어)
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Sheet } from "../components/Sheet";
import { CheckCircle, T } from "../components/ui";
import { color, radius } from "../theme/tokens";
import { getProfile, updateProfile } from "../lib/api";

const LANGS = [{ id: "ko", name: "한국어", sub: "Korean" }, { id: "en", name: "English", sub: "영어" }, { id: "ja", name: "日本語", sub: "일본어" }];

export default function Language() {
  const [cur, setCur] = useState<string | null>(null);
  useEffect(() => { getProfile().then((p) => setCur(p?.language ?? "ko")); }, []);
  const pick = async (id: string) => { setCur(id); await updateProfile({ language: id }); setTimeout(() => router.back(), 200); };
  return (
    <Sheet title="언어">
      <View style={{ backgroundColor: color.white, borderRadius: radius.card, paddingHorizontal: 16 }} accessibilityRole="radiogroup">
        {LANGS.map((l, i) => (
          <Pressable key={l.id} accessibilityRole="radio" accessibilityState={{ checked: cur === l.id }} onPress={() => pick(l.id)}
            style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 60, borderBottomWidth: i < LANGS.length - 1 ? 1 : 0, borderColor: color.divider }}>
            <View style={{ flex: 1 }}>
              <T v="bodyBold">{l.name}</T>
              <T v="caption" c={color.text4}>{l.sub}</T>
            </View>
            <CheckCircle on={cur === l.id} />
          </Pressable>
        ))}
      </View>
      <T v="caption" c={color.text4}>앱 화면과 앞으로 오는 리포트가 이 언어로 바뀌어요. 받은 리포트는 그대로예요.</T>
    </Sheet>
  );
}
