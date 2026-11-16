// Ripe 마크: 동그란 열매에 잎 하나. 안이 아래에서부터 천천히 차오르고(익는 중) 잎이 살짝 흔들린다.
import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import Svg, { Circle, ClipPath, Defs, G, Path, Rect } from "react-native-svg";
import { color } from "../theme/tokens";

const ARect = Animated.createAnimatedComponent(Rect);

export function RipeMark({ size = 72, speed = 4000, tint = color.blue, still = false }: { size?: number; speed?: number; tint?: string; still?: boolean }) {
  const fill = useRef(new Animated.Value(still ? 0.6 : 0)).current;
  useEffect(() => {
    if (still) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(fill, { toValue: 1, duration: speed, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      Animated.timing(fill, { toValue: 0, duration: speed, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [fill, speed, still]);
  // 목업 값: 빈 상태 y=22+46, 가득 y=22+10
  const y = fill.interpolate({ inputRange: [0, 1], outputRange: [68, 32] });
  const id = `rp${size}${speed}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Defs>
        <ClipPath id={id}><Circle cx={50} cy={58} r={33} /></ClipPath>
      </Defs>
      <G clipPath={`url(#${id})`}>
        <ARect x={12} y={y as unknown as number} width={76} height={76} fill={tint} />
      </G>
      <Circle cx={50} cy={58} r={33} fill="none" stroke={tint} strokeWidth={8} />
      <Path d="M50 25c0-7 2-11 6-14" fill="none" stroke={tint} strokeWidth={7} strokeLinecap="round" />
      <Path d="M55 17c7-11 21-11 27-6-7 10-19 12-27 6z" fill={tint} />
    </Svg>
  );
}

// 알림 아이콘용 작은 흰 마크
export function RipeMarkSolid({ size = 26, tint = color.white }: { size?: number; tint?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx={50} cy={58} r={30} fill={tint} />
      <Path d="M50 28c0-7 2-11 6-14" fill="none" stroke={tint} strokeWidth={8} strokeLinecap="round" />
      <Path d="M55 20c7-11 21-11 27-6-7 10-19 12-27 6z" fill={tint} />
    </Svg>
  );
}
