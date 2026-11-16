// 카카오·구글 로그인: 브라우저로 로그인하고 돌아온 주소의 code 로 세션을 만든다 (PKCE)
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "./supabase";
import { ensureProfile, saveConsents, signInWith } from "./api";

WebBrowser.maybeCompleteAuthSession();

export async function loginWith(provider: "kakao" | "google", consents: { improve: boolean }) {
  const redirectTo = Linking.createURL("auth");
  const url = await signInWith(provider, redirectTo);
  if (Platform.OS === "web") return "redirected" as const; // 웹은 페이지가 넘어간다
  if (!url) throw new Error("로그인 주소를 받지 못했어요");
  const res = await WebBrowser.openAuthSessionAsync(url, redirectTo);
  if (res.type !== "success") return "cancelled" as const;
  const code = new URL(res.url).searchParams.get("code");
  if (!code) throw new Error("로그인 응답이 올바르지 않아요");
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
  await ensureProfile();
  await saveConsents([
    { kind: "terms", agreed: true }, { kind: "privacy", agreed: true }, { kind: "overseas_transfer", agreed: true },
    { kind: "personalize_from_activity", agreed: consents.improve },
    ...(provider === "kakao" ? [{ kind: "kakao_message", agreed: true }] : []),
  ]);
  return "ok" as const;
}
