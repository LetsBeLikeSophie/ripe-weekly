// S_Memory: 기억하는 내 상황 (하나씩 또는 전부 지우기)
import { useCallback, useState } from "react";
import { View } from "react-native";
import { useFocusEffect } from "expo-router";
import { IconButton, Screen, T, TextButton, TopBar } from "../components/ui";
import { color, radius } from "../theme/tokens";
import { deleteMemory, listMemories, Memory } from "../lib/api";
import { md } from "../lib/format";

export default function MemoryScreen() {
  const [list, setList] = useState<Memory[] | null>(null);
  const load = useCallback(() => { listMemories().then(setList); }, []);
  useFocusEffect(load);
  return (
    <Screen scroll top={<TopBar title="기억하는 내 상황" label="프로필로" />}
      footer={list?.length ? <TextButton label="전부 지우기" c={color.red} onPress={async () => { await deleteMemory(); load(); }} /> : undefined}>
      <T c={color.text3}>물어보기에서 말씀하신 내용 중 리포트를 맞추는 데 쓰는 것들이에요.</T>
      <View style={{ marginTop: 16, backgroundColor: color.white, borderRadius: radius.card, paddingHorizontal: 16 }}>
        {list && !list.length ? <T c={color.text4} style={{ paddingVertical: 18 }}>기억하는 내용이 없어요.</T> : null}
        {(list ?? []).map((m, i) => (
          <View key={m.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 60, borderBottomWidth: i < list!.length - 1 ? 1 : 0, borderColor: color.divider }}>
            <View style={{ flex: 1, gap: 2, paddingVertical: 10 }}>
              <T v="bodyBold">{m.text}</T>
              <T v="caption" c={color.text4}>{md(m.created_at)}{m.source ? ` · ${m.source}` : ""}</T>
            </View>
            <IconButton name="trash" label={`${m.text} 지우기`} iconColor={color.text3} onPress={async () => { await deleteMemory(m.id); load(); }} />
          </View>
        ))}
      </View>
    </Screen>
  );
}
