import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BlackHanSans_400Regular } from "@expo-google-fonts/black-han-sans";
import { NanumPenScript_400Regular } from "@expo-google-fonts/nanum-pen-script";
import { GochiHand_400Regular } from "@expo-google-fonts/gochi-hand";
import { NotoSansKR_400Regular, NotoSansKR_500Medium, NotoSansKR_700Bold } from "@expo-google-fonts/noto-sans-kr";
import { color } from "../theme/tokens";

SplashScreen.preventAutoHideAsync();

// 아래에서 올라오는 시트로 띄울 화면들 (뒤에 원래 화면이 보인다)
const SHEETS = ["clarify", "login", "language", "delete-topic", "fix-preview", "limit", "share", "trial-soon", "login-fail", "connect"];

export default function RootLayout() {
  const [loaded] = useFonts({
    BlackHanSans_400Regular, NanumPenScript_400Regular, GochiHand_400Regular,
    NotoSansKR_400Regular, NotoSansKR_500Medium, NotoSansKR_700Bold,
  });
  useEffect(() => { if (loaded) SplashScreen.hideAsync(); }, [loaded]);
  if (!loaded) return null;
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg } }}>
        {SHEETS.map((name) => (
          <Stack.Screen key={name} name={name} options={{ presentation: "transparentModal", animation: "fade", contentStyle: { backgroundColor: "transparent" } }} />
        ))}
      </Stack>
    </SafeAreaProvider>
  );
}
