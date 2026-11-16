// "지금 어디쯤일까" 트렌드 곡선: 0 막 뜨기 시작 → 0.5 정점 → 1 식는 중. 항목마다 점 하나.
import Svg, { Circle, Path, Text as SvgText } from "react-native-svg";
import { font, stageColor } from "../theme/tokens";

const W = 314, H = 170;
const P0 = [6, 150], C1 = [70, 150], C2 = [110, 26], P1 = [157, 26], C3 = [204, 26], C4 = [244, 150], P2 = [308, 150];
const D = "M6 150 C 70 150, 110 26, 157 26 C 204 26, 244 150, 308 150";

function bez(t: number, a: number[], b: number[], c: number[], d: number[]) {
  const u = 1 - t;
  return [0, 1].map((k) => u * u * u * a[k] + 3 * u * u * t * b[k] + 3 * u * t * t * c[k] + t * t * t * d[k]);
}
function pointAt(pos: number) {
  const p = Math.min(1, Math.max(0, pos));
  return p <= 0.5 ? bez(p * 2, P0, C1, C2, P1) : bez((p - 0.5) * 2, P1, C3, C4, P2);
}

export function TrendCurve({ items }: { items: { name: string; stage: string; pos: number }[] }) {
  const label = "트렌드 곡선: " + items.map((i) => `${i.name} ${i.pos < 0.45 ? "올라가는 중" : i.pos <= 0.55 ? "꼭대기" : "내려가는 중"}`).join(", ");
  return (
    <Svg width="100%" height={H + 8} viewBox={`0 -8 ${W} ${H + 8}`} accessibilityLabel={label} accessibilityRole="image">
      <Path d={D} fill="none" stroke="#D5DCEC" strokeWidth={10} strokeLinecap="round" />
      <Path d={D} fill="none" stroke="#2F5FB3" strokeWidth={3} strokeLinecap="round" />
      {items.slice(0, 4).map((it, i) => {
        const [x, y] = pointAt(it.pos);
        const [, ink, dot] = stageColor[it.stage] ?? stageColor.rising;
        const left = it.pos < 0.5;
        return [
          <Circle key={`c${i}`} cx={x} cy={y} r={9} fill={dot} stroke="#FFFFFF" strokeWidth={3} />,
          <SvgText key={`t${i}`} x={left ? x - 6 : x + 10} y={y + (left ? 28 : -8)} textAnchor={left ? "end" : "start"} fontSize={12} fontWeight="700" fill={ink} fontFamily={font.bodyBold}>{it.name.length > 10 ? it.name.slice(0, 10) + "…" : it.name}</SvgText>,
        ];
      })}
      <SvgText x={6} y={H - 2} fontSize={11} fill="#6A6A6A" fontFamily={font.body}>막 뜨기 시작</SvgText>
      <SvgText x={157} y={H - 2} textAnchor="middle" fontSize={11} fill="#6A6A6A" fontFamily={font.body}>정점</SvgText>
      <SvgText x={308} y={H - 2} textAnchor="end" fontSize={11} fill="#6A6A6A" fontFamily={font.body}>식는 중</SvgText>
    </Svg>
  );
}
