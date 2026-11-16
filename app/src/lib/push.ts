// 푸시 토큰을 받아 프로필에 저장한다 (보내는 쪽은 서버)
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { getProfile, updateProfile } from "./api";
import { db, supabase } from "./supabase";

export async function registerPush() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("reports", { name: "새 리포트", importance: Notifications.AndroidImportance.DEFAULT });
  }
  const projectId = (Constants.expoConfig?.extra as any)?.eas?.projectId;
  const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  await db().from("push_tokens").upsert({ user_id: u.user.id, token, platform: Platform.OS }, { onConflict: "token" });
  const p = await getProfile();
  const set = new Set(p?.channels ?? []); set.add("app");
  await updateProfile({ channels: [...set] });
}
