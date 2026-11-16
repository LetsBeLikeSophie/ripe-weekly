// S_DeleteConfirm: 리포트 지우기 확인
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Sheet } from "../components/Sheet";
import { ButtonPair, T } from "../components/ui";
import { color } from "../theme/tokens";
import { deleteTopic } from "../lib/api";

export default function DeleteTopic() {
  const { id, title } = useLocalSearchParams<{ id: string; title: string }>();
  const [busy, setBusy] = useState(false);
  return (
    <Sheet title={`${title}를 지울까요?`} footer={
      <ButtonPair label="삭제" danger disabled={busy} onCancel={() => router.back()} onPress={async () => {
        setBusy(true);
        await deleteTopic(id);
        router.dismissAll(); router.replace("/home");
      }} />
    }>
      <T c={color.text3}>지난 리포트도 같이 지워지고, 되돌릴 수 없어요. 잠깐 안 받으려면 설정에서 끄면 돼요.</T>
    </Sheet>
  );
}
