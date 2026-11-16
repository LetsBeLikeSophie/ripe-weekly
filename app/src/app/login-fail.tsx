// S_LoginFail
import { router } from "expo-router";
import { Sheet } from "../components/Sheet";
import { ButtonPair, T } from "../components/ui";
import { color } from "../theme/tokens";

export default function LoginFail() {
  return (
    <Sheet title="로그인하지 못했어요" footer={<ButtonPair label="다시 시도" onCancel={() => router.back()} onPress={() => router.replace("/login")} />}>
      <T c={color.text3}>로그인이 취소됐거나 연결이 끊겼어요. 다시 시도하거나 다른 방법으로 로그인해 주세요.</T>
    </Sheet>
  );
}
