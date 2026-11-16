// 선 아이콘 모음 (목업에 쓰인 것과 같은 모양). 크기·색만 바꿔 쓴다.
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { color } from "../theme/tokens";

export type IconName =
  | "back" | "close" | "mic" | "share" | "chat" | "gear" | "trash" | "check" | "refresh" | "wifiOff"
  | "plus" | "list" | "lock" | "eye" | "eyeOff" | "copy" | "undo" | "chevronRight" | "chevronDown" | "send"
  // 리포트 아이콘 (AI가 고르는 키와 같은 이름)
  | "cake" | "coffee" | "music" | "house" | "chart" | "shopping-bag" | "flask" | "chip" | "shirt" | "sparkle"
  | "plane" | "book" | "leaf" | "game" | "camera" | "heart" | "megaphone" | "briefcase";

const paths: Record<IconName, string[]> = {
  back: ["M15 6l-6 6 6 6"],
  close: ["M6 6l12 12M18 6L6 18"],
  mic: ["M5 11a7 7 0 0 0 14 0M12 18v3"],
  share: ["M12 15V4M8 8l4-4 4 4", "M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7"],
  chat: ["M4 5h16v11H9l-5 4z"],
  gear: ["M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z", "M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"],
  trash: ["M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"],
  check: ["M5 12l5 5L20 7"],
  refresh: ["M20 11a8 8 0 1 0-2.3 5.7", "M20 4v7h-7"],
  wifiOff: ["M2 8.8a15 15 0 0 1 4.2-2.6M22 8.8a15 15 0 0 0-9.6-3.6M5 12.6a10 10 0 0 1 3.2-1.8M19 12.6a10 10 0 0 0-3.9-2.2M8.5 16.4a5 5 0 0 1 7 0M12 20h.01M3 3l18 18"],
  plus: ["M12 5v14M5 12h14"],
  list: ["M4 4h16v16H4zM8 9h8M8 13h8M8 17h5"],
  lock: ["M6 11h12v9H6z", "M8 11V8a4 4 0 0 1 8 0v3"],
  eye: ["M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z", "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"],
  eyeOff: ["M3 3l18 18", "M10.6 6.1A10 10 0 0 1 12 6c6.4 0 10 6 10 6a17 17 0 0 1-3.2 3.9M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.6 9.6 0 0 0 5.4-1.6", "M9.9 9.9a3 3 0 0 0 4.2 4.2"],
  copy: ["M9 9h11v11H9z", "M5 15H4V4h11v1"],
  undo: ["M9 14L4 9l5-5", "M4 9h11a5 5 0 0 1 0 10h-3"],
  chevronRight: ["M9 6l6 6-6 6"],
  chevronDown: ["M6 9l6 6 6-6"],
  send: ["M5 12h14M13 6l6 6-6 6"],
  cake: ["M4 20h16v-8H4z", "M4 15c2 1.5 4 1.5 6 0s4-1.5 6 0 3 1.5 4 0", "M12 12V8", "M12 5.5c.8-.8.8-1.7 0-2.5-.8.8-.8 1.7 0 2.5z"],
  coffee: ["M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z", "M17 10h1.5a2.5 2.5 0 0 1 0 5H17", "M8 3v3M12 3v3"],
  music: ["M9 18V5l11-2v13", "M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"],
  house: ["M3 11l9-7 9 7", "M5 10v10h14V10", "M10 20v-5h4v5"],
  chart: ["M4 20V4", "M4 20h16", "M8 16v-4M12 16V8M16 16v-6"],
  "shopping-bag": ["M5 8h14l-1 12H6z", "M9 8V6a3 3 0 0 1 6 0v2"],
  flask: ["M9 3h6", "M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3", "M7 15h10"],
  chip: ["M7 7h10v10H7z", "M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4"],
  shirt: ["M8 3l4 3 4-3 5 4-3 3v11H6V10L3 7z"],
  sparkle: ["M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"],
  plane: ["M2 16l20-8-7 13-3-6z", "M12 15l3-4"],
  book: ["M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2z", "M4 19V5"],
  leaf: ["M5 19c0-9 6-14 15-14 0 9-5 15-14 15", "M5 19l7-7"],
  game: ["M6 9h12a4 4 0 0 1 0 8c-1.5 0-2.5-1-3-2H9c-.5 1-1.5 2-3 2a4 4 0 0 1 0-8z", "M8 11v4M6 13h4M15.5 12.5h.01M17.5 14.5h.01"],
  camera: ["M4 8h4l2-3h4l2 3h4v11H4z", "M12 10a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z"],
  heart: ["M12 20s-7-4.4-9-9a4.5 4.5 0 0 1 9-3 4.5 4.5 0 0 1 9 3c-2 4.6-9 9-9 9z"],
  megaphone: ["M4 10v4h3l8 5V5L7 10z", "M18 9a4 4 0 0 1 0 6"],
  briefcase: ["M4 8h16v11H4z", "M9 8V5h6v3", "M4 13h16"],
};

export function Icon({ name, size = 22, stroke = color.ink, width = 2 }: { name: IconName; size?: number; stroke?: string; width?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      {name === "mic" && <Rect x={9} y={3} width={6} height={11} rx={3} />}
      {paths[name].map((d, i) => <Path key={i} d={d} />)}
    </Svg>
  );
}

// 리포트 아이콘 키가 없거나 모르는 키면 첫 글자로 보여 준다
export const TOPIC_ICONS = new Set<string>(["cake", "coffee", "music", "house", "chart", "shopping-bag", "flask", "chip", "shirt", "sparkle", "plane", "book", "leaf", "game", "camera", "heart", "megaphone", "briefcase"]);

export function Dot({ size = 8, fill = color.blue }: { size?: number; fill?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 10 10">
      <Circle cx={5} cy={5} r={5} fill={fill} />
    </Svg>
  );
}
