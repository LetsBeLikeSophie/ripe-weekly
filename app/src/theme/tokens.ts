// 디자인 기본값: 목업(트렌드 훑기 앱 목업)에서 그대로 가져온 값만 쓴다. 화면에서 숫자를 새로 만들지 않는다.

export const color = {
  blue: "#2F5FB3",
  blueDark: "#234A8C",
  blueSoft: "#E8EEF9",
  blueLine: "#9BB0D8",
  bg: "#F7F7F4",
  white: "#FFFFFF",
  ink: "#1B1B1B",
  text2: "#333333",
  text3: "#555555",
  text4: "#6A6A6A",
  line: "#E2E2DC",
  divider: "#ECECE6",
  grabber: "#D5D5CF",
  muted: "#ECECE6",
  red: "#B42318",
  redSoft: "#FDECEA",
  redInk: "#7A1A12",
  kakao: "#FEE500",
  kakaoInk: "#191919",
  dim: "rgba(27,27,27,0.42)",
  barIdle: "#D5DCEC",
} as const;

// 단계별 색 (목업 리포트 화면): [태그 배경, 태그 글자, 막대·점]
export const stageColor: Record<string, [string, string, string]> = {
  new: ["#E8EEF9", "#2F5FB3", "#2F5FB3"],
  rising: ["#FFE3C2", "#7A3B00", "#E2621B"],
  peak: ["#FFD1D1", "#7F1D1D", "#B42318"],
  cooling: ["#DCE6F2", "#1F3A5C", "#5A7BA8"],
};

export const font = {
  logo: "GochiHand_400Regular", // "Ripe Weekly" 글자 로고
  title: "BlackHanSans_400Regular", // 큰 제목
  hand: "NanumPenScript_400Regular", // 손글씨 강조
  body: "NotoSansKR_400Regular",
  bodyMedium: "NotoSansKR_500Medium",
  bodyBold: "NotoSansKR_700Bold",
} as const;

export const radius = {
  input: 14,
  card: 18,
  cardLg: 20,
  sheet: 26,
  pill: 999,
} as const;

export const space = {
  screenX: 22, // 화면 좌우 여백
  topBar: 52, // 상태바 아래 첫 줄 위치 (목업 기준, 실제로는 safe area + 8)
  gap: 14,
} as const;

export const size = {
  button: 54,
  buttonSm: 50,
  touch: 44, // 최소 터치 영역
  input: 52,
} as const;

// 글자 크기·줄 간격 (목업 값)
export const type = {
  hero: { fontFamily: font.title, fontSize: 40, lineHeight: 43 },
  h1: { fontFamily: font.title, fontSize: 38, lineHeight: 43 },
  h2: { fontFamily: font.title, fontSize: 26, lineHeight: 31 },
  h3: { fontFamily: font.title, fontSize: 24, lineHeight: 30 },
  hand: { fontFamily: font.hand, fontSize: 22, lineHeight: 24 },
  handLg: { fontFamily: font.hand, fontSize: 26, lineHeight: 28 },
  body: { fontFamily: font.body, fontSize: 15, lineHeight: 23 },
  bodyBold: { fontFamily: font.bodyBold, fontSize: 15, lineHeight: 23 },
  small: { fontFamily: font.body, fontSize: 14, lineHeight: 21 },
  smallBold: { fontFamily: font.bodyBold, fontSize: 14, lineHeight: 21 },
  caption: { fontFamily: font.body, fontSize: 13, lineHeight: 19 },
  micro: { fontFamily: font.body, fontSize: 12, lineHeight: 17 },
  label: { fontFamily: font.bodyBold, fontSize: 12, lineHeight: 16, letterSpacing: 1 },
  button: { fontFamily: font.bodyBold, fontSize: 16 },
} as const;
