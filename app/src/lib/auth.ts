// 카카오·구글 로그인
// 앱: 브라우저 창으로 로그인하고 돌아온 주소의 code 로 세션을 만든다 (PKCE)
// 웹: 페이지가 카카오·구글로 넘어갔다가 /auth 로 돌아온다. 동의 값은 넘어가기 전에 저장해 두고 /auth 에서 마저 처리한다.
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "./supabase";
import { ensureProfile, saveConsents, signInWith } from "./api";

WebBrowser.maybeCompleteAuthSession();

type Provider = "kakao" | "google";
type Pending = { provider: Provider; improve: boolean };
const PENDING = "ripe.pendingLogin";

export async function loginWith(provider: Provider, consents: { improve: boolean }) {
  const redirectTo = Linking.createURL("auth");
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(PENDING, JSON.stringify({ provider, improve: consents.improve } satisfies Pending));
    await signInWith(provider, redirectTo); // 여기서 페이지가 넘어간다
    return "redirected" as const;
  }
  const url = await signInWith(provider, redirectTo);
  if (!url) throw new Error("로그인 주소를 받지 못했어요");
  const res = await WebBrowser.openAuthSessionAsync(url, redirectTo);
  if (res.type !== "success") return "cancelled" as const;
  const code = new URL(res.url).searchParams.get("code");
  if (!code) throw new Error("로그인 응답이 올바르지 않아요");
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
  await finishLogin({ provider, improve: consents.improve });
  return "ok" as const;
}

// 로그인 뒤 공통 처리: 프로필 만들기 + 동의 기록
async function finishLogin(p: Pending) {
  await ensureProfile();
  await saveConsents([
    { kind: "terms", agreed: true }, { kind: "privacy", agreed: true }, { kind: "overseas_transfer", agreed: true },
    { kind: "personalize_from_activity", agreed: p.improve },
    ...(p.provider === "kakao" ? [{ kind: "kakao_message", agreed: true }] : []),
  ]);
}

// 웹: /auth 로 돌아왔을 때. 세션은 supabase-js 가 주소의 code 로 자동으로 만든다.
export async function completeWebLogin(): Promise<"ok" | "failed"> {
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  if (params.get("error")) return "failed";
  for (let i = 0; i < 20; i++) {
    const { data } = await supabase.auth.getSession();
    if (data.session && !data.session.user.is_anonymous) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  const { data } = await supabase.auth.getSession();
  if (!data.session || data.session.user.is_anonymous) return "failed";
  const raw = await AsyncStorage.getItem(PENDING);
  await AsyncStorage.removeItem(PENDING);
  const ids = data.session.user.identities?.map((x) => x.provider) ?? [];
  const p: Pending = raw ? JSON.parse(raw) : { provider: ids.includes("kakao") ? "kakao" : "google", improve: false };
  await finishLogin(p);
  return "ok";
}
