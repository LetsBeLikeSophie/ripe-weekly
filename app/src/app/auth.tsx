// 웹 로그인 돌아오는 곳 (ripe.itssophie.dev/auth). 앱에서는 로그인 창이 이 주소를 가로채서 여기 올 일이 거의 없다.
import { useEffect } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { router } from "expo-router";
import { T } from "../components/ui";
import { color } from "../theme/tokens";
import { completeWebLogin } from "../lib/auth";

export default function AuthReturn() {
  useEffect(() => {
    if (Platform.OS !== "web") { router.replace("/home"); return; }
    completeWebLogin().then((r) => router.replace(r === "ok" ? "/home" : "/login-fail"));
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: color.bg, alignItems: "center", justifyContent: "center", gap: 12 }}>
      <ActivityIndicator color={color.blue} />
      <T c={color.text3}>로그인하고 있어요…</T>
    </View>
  );
}
