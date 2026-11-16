// 스토어 구독 관리 주소 (해지는 스토어에서만 할 수 있다)
import { Platform } from "react-native";
export const PRODUCT_IDS = { basic_month: "ripe_basic_month", basic_year: "ripe_basic_year", plus_month: "ripe_plus_month", plus_year: "ripe_plus_year" } as const;
export function manageSubscriptionUrl() {
  return Platform.OS === "ios" ? "https://apps.apple.com/account/subscriptions" : "https://play.google.com/store/account/subscriptions";
}

// 스토어 결제는 개발 빌드에서 붙인다 (RevenueCat 또는 react-native-iap). 붙이기 전엔 분명히 실패를 알린다.
export async function purchase(_plan: "basic" | "plus", _period: "month" | "year"): Promise<boolean> {
  throw new Error("아직 스토어 결제가 연결되지 않았어요");
}
export async function restore(): Promise<boolean> {
  throw new Error("아직 스토어 결제가 연결되지 않았어요");
}
