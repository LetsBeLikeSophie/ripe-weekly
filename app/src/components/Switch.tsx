// 켜기·끄기 스위치 (목업 모양: 54×32, 파란 트랙)
import { Pressable, View } from "react-native";
import { color, radius } from "../theme/tokens";

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Pressable accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: on }} onPress={() => onChange(!on)} hitSlop={8}
      style={{ width: 54, height: 32, borderRadius: radius.pill, padding: 3, flexDirection: "row", justifyContent: on ? "flex-end" : "flex-start", backgroundColor: on ? color.blue : "#D5D5CF" }}>
      <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: color.white }} />
    </Pressable>
  );
}
