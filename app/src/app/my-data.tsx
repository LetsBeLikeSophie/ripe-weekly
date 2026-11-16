// S_MyData: 내 데이터 보기·내려받기
import { useEffect, useState } from "react";
import { Share, View } from "react-native";
import { router } from "expo-router";
import { Button, InfoRows, Screen, T, TextButton, TopBar } from "../components/ui";
import { color } from "../theme/tokens";
import { exportMyData, myDataCounts } from "../lib/api";

export default function MyData() {
  const [c, setC] = useState<{ topics: number; reports: number; asks: number; memories: number } | null>(null);
  const [label, setLabel] = useState("전부 내려받기 (JSON)");
  useEffect(() => { myDataCounts().then(setC); }, []);
  return (
    <Screen scroll top={<TopBar title="내 데이터" label="프로필로" />} footer={
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: "row" }}><Button label={label} onPress={async () => {
          setLabel("만드는 중…");
          try { await Share.share({ message: await exportMyData(), title: "ripe-weekly-my-data.json" }); setLabel("전부 내려받기 (JSON)"); }
          catch { setLabel("다시 시도"); }
        }} /></View>
        <TextButton label="탈퇴하고 전부 지우기" c={color.red} onPress={() => router.push("/withdraw")} />
      </View>
    }>
      <T c={color.text3}>Ripe Weekly가 가진 내 정보예요. 전부 내려받거나 지울 수 있어요.</T>
      <View style={{ marginTop: 16 }}>
        <InfoRows rows={[
          { k: "리포트 설정", v: c ? `${c.topics}개` : "" },
          { k: "받은 리포트", v: c ? `${c.reports}편` : "" },
          { k: "물어본 것", v: c ? `${c.asks}개` : "" },
          { k: "기억한 내 상황", v: c ? `${c.memories}개` : "", onPress: () => router.push("/memory") },
        ]} />
      </View>
      <T v="caption" c={color.text4} style={{ marginTop: 12 }}>리포트를 만들 때 AI에는 요청 문장과 질문만 보내요. 이름·메일은 보내지 않아요.</T>
    </Screen>
  );
}
