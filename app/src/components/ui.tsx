// 공통 부품: 화면은 이 파일의 부품만 조립해서 만든다.
import { ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleProp, Text, TextStyle, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { color, font, radius, size, space, stageColor, type } from "../theme/tokens";
import { Icon, IconName, TOPIC_ICONS } from "./Icon";

// ---------- 화면 틀 ----------
export function Screen({ children, scroll = false, bg = color.bg, padded = true, top, footer, style }: {
  children: ReactNode; scroll?: boolean; bg?: string; padded?: boolean; top?: ReactNode; footer?: ReactNode; style?: StyleProp<ViewStyle>;
}) {
  const inset = useSafeAreaInsets();
  const pad: ViewStyle = { paddingHorizontal: padded ? space.screenX : 0, gap: space.gap };
  return (
    <View style={{ flex: 1, backgroundColor: bg, paddingTop: inset.top }}>
      {top ? <View style={{ paddingHorizontal: padded ? space.screenX : 0 }}>{top}</View> : null}
      {scroll ? (
        <ScrollView contentContainerStyle={[pad, { paddingBottom: 24, flexGrow: 1 }, style]} keyboardShouldPersistTaps="handled">{children}</ScrollView>
      ) : (
        <View style={[pad, { flex: 1 }, style]}>{children}</View>
      )}
      {footer ? <View style={{ paddingHorizontal: padded ? space.screenX : 0, paddingBottom: Math.max(inset.bottom, 16) + 8, paddingTop: 8, gap: 8 }}>{footer}</View> : null}
    </View>
  );
}

// 위쪽 바: 왼쪽 뒤로(또는 닫기), 가운데 제목, 오른쪽 자리
export function TopBar({ title, left = "back", onLeft, right, label }: {
  title?: string; left?: "back" | "close" | "none"; onLeft?: () => void; right?: ReactNode; label?: string;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: size.touch, marginHorizontal: -6, marginTop: 8 }}>
      {left === "none" ? <View style={{ width: size.touch }} /> : (
        <IconButton name={left} label={label ?? (left === "back" ? "뒤로" : "닫기")} onPress={onLeft ?? (() => router.back())} />
      )}
      {title ? <Text style={[type.bodyBold, { color: color.ink }]} numberOfLines={1}>{title}</Text> : <View />}
      <View style={{ minWidth: size.touch, alignItems: "flex-end", flexDirection: "row", justifyContent: "flex-end", gap: 6 }}>{right}</View>
    </View>
  );
}

// 상단 작은 로고 줄 (RIPE WEEKLY)
export function Brand({ right }: { right?: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: size.touch, marginTop: 8 }}>
      <Text style={[type.label, { color: color.ink }]}>RIPE WEEKLY</Text>
      {right}
    </View>
  );
}

export function IconButton({ name, label, onPress, tone = "plain", iconColor }: {
  name: IconName; label: string; onPress?: () => void; tone?: "plain" | "soft" | "solid"; iconColor?: string;
}) {
  const bg = tone === "soft" ? color.blueSoft : tone === "solid" ? color.blue : "transparent";
  const fg = iconColor ?? (tone === "soft" ? color.blue : tone === "solid" ? color.white : color.ink);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={4}
      style={({ pressed }) => ({ width: size.touch, height: size.touch, borderRadius: radius.pill, backgroundColor: bg, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.6 : 1 })}>
      <Icon name={name} size={22} stroke={fg} />
    </Pressable>
  );
}

// ---------- 글자 ----------
export function Title({ children, color: c = color.blue, size: s = "hero", style }: { children: ReactNode; color?: string; size?: "hero" | "h1" | "h2" | "h3"; style?: StyleProp<TextStyle> }) {
  return <Text accessibilityRole="header" style={[type[s], { color: c }, style]}>{children}</Text>;
}
export function Hand({ children, lg, style }: { children: ReactNode; lg?: boolean; style?: StyleProp<TextStyle> }) {
  return <Text style={[lg ? type.handLg : type.hand, { color: color.blue }, style]}>{children}</Text>;
}
export function T({ children, v = "body", c = color.ink, style, lines }: {
  children: ReactNode; v?: keyof typeof type; c?: string; style?: StyleProp<TextStyle>; lines?: number;
}) {
  return <Text numberOfLines={lines} style={[type[v], { color: c }, style]}>{children}</Text>;
}
export const B = ({ children, c }: { children: ReactNode; c?: string }) => <Text style={{ fontFamily: font.bodyBold, color: c }}>{children}</Text>;

// ---------- 버튼 ----------
type BtnKind = "primary" | "secondary" | "danger" | "kakao" | "google" | "ghost";
export function Button({ label, onPress, kind = "primary", disabled, loading, icon, small }: {
  label: string; onPress?: () => void; kind?: BtnKind; disabled?: boolean; loading?: boolean; icon?: ReactNode; small?: boolean;
}) {
  const s: Record<BtnKind, { bg: string; fg: string; border?: string }> = {
    primary: { bg: color.blue, fg: color.white },
    secondary: { bg: color.white, fg: color.ink, border: color.line },
    danger: { bg: color.red, fg: color.white },
    kakao: { bg: color.kakao, fg: color.kakaoInk },
    google: { bg: color.white, fg: color.ink, border: color.line },
    ghost: { bg: "transparent", fg: color.text3 },
  };
  const st = s[kind];
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled, busy: !!loading }} disabled={disabled || loading} onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center",
        minHeight: small || kind === "secondary" ? size.buttonSm : size.button, borderRadius: radius.pill, paddingHorizontal: 18,
        backgroundColor: st.bg, borderWidth: st.border ? 2 : 0, borderColor: st.border,
        opacity: disabled ? 0.4 : pressed ? 0.85 : 1, flexGrow: 1, flexBasis: 0,
      })}>
      {loading ? <ActivityIndicator color={st.fg} /> : icon}
      <Text style={[type.button, { color: st.fg, fontSize: kind === "secondary" ? 15 : 16 }]}>{label}</Text>
    </Pressable>
  );
}

// 취소 + 주 버튼 (모달·확인 화면 공통)
export function ButtonPair({ cancel = "취소", onCancel, label, onPress, danger, disabled }: {
  cancel?: string; onCancel?: () => void; label: string; onPress?: () => void; danger?: boolean; disabled?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <Button kind="secondary" label={cancel} onPress={onCancel ?? (() => router.back())} />
      <Button kind={danger ? "danger" : "primary"} label={label} onPress={onPress} disabled={disabled} />
    </View>
  );
}

export function TextButton({ label, onPress, c = color.text3, align = "center", underline }: {
  label: string; onPress?: () => void; c?: string; align?: "center" | "flex-start"; underline?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ alignSelf: align, minHeight: size.touch, justifyContent: "center" }}>
      <Text style={[type.smallBold, { color: c, textDecorationLine: underline ? "underline" : "none" }]}>{label}</Text>
    </Pressable>
  );
}

// ---------- 묶음 ----------
export function Card({ children, style, tone = "white", onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; tone?: "white" | "blue" | "soft" | "red"; onPress?: () => void }) {
  const bg = { white: color.white, blue: color.blue, soft: color.blueSoft, red: color.redSoft }[tone];
  const base: ViewStyle = { backgroundColor: bg, borderRadius: radius.card, padding: 16, gap: 8 };
  if (onPress) return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [base, style, { opacity: pressed ? 0.85 : 1 }]}>{children}</Pressable>;
  return <View style={[base, style]}>{children}</View>;
}

// 흰 카드 안 "이름 — 값" 줄들
export function InfoRows({ rows }: { rows: { k: string; v: ReactNode; onPress?: () => void }[] }) {
  return (
    <View style={{ backgroundColor: color.white, borderRadius: radius.card, paddingHorizontal: 16, paddingVertical: 4 }}>
      {rows.map((r, i) => {
        const inner = (
          <>
            <T v="body" c={color.text3}>{r.k}</T>
            {typeof r.v === "string" ? <T v="bodyBold">{r.v}</T> : r.v}
          </>
        );
        const st: ViewStyle = { flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 52, borderBottomWidth: i < rows.length - 1 ? 1 : 0, borderColor: color.divider };
        return r.onPress
          ? <Pressable key={r.k} accessibilityRole="button" onPress={r.onPress} style={st}>{inner}</Pressable>
          : <View key={r.k} style={st}>{inner}</View>;
      })}
    </View>
  );
}

// 링크처럼 생긴 목록 줄 (프로필 등)
export function LinkRows({ rows }: { rows: { label: string; onPress: () => void; danger?: boolean }[] }) {
  return (
    <View style={{ backgroundColor: color.white, borderRadius: radius.card, paddingHorizontal: 16, paddingVertical: 4 }}>
      {rows.map((r, i) => (
        <Pressable key={r.label} accessibilityRole="link" onPress={r.onPress}
          style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 52, borderBottomWidth: i < rows.length - 1 ? 1 : 0, borderColor: color.divider }}>
          <T v="bodyBold" c={r.danger ? color.red : color.ink}>{r.label}</T>
          <Icon name="chevronRight" size={18} stroke={color.text4} />
        </Pressable>
      ))}
    </View>
  );
}

export function Chip({ label, onPress, on, dashed }: { label: string; onPress?: () => void; on?: boolean; dashed?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!on }} onPress={onPress}
      style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: radius.pill, justifyContent: "center",
        borderWidth: on ? 0 : 2, borderStyle: dashed ? "dashed" : "solid", borderColor: color.line, backgroundColor: on ? color.blue : color.white }}>
      <T v="smallBold" c={on ? color.white : color.ink}>{label}</T>
    </Pressable>
  );
}

// 체크 동그라미 (켜짐/꺼짐)
export function CheckCircle({ on, size: s = 26 }: { on: boolean; size?: number }) {
  return (
    <View style={{ width: s, height: s, borderRadius: s, alignItems: "center", justifyContent: "center",
      backgroundColor: on ? color.blue : "transparent", borderWidth: on ? 0 : 2, borderColor: color.grabber }}>
      {on ? <Icon name="check" size={s * 0.6} stroke={color.white} width={2.6} /> : null}
    </View>
  );
}

// 체크 상자 (동의용)
export function CheckBox({ on, label, onPress, children }: { on: boolean; label?: string; onPress: () => void; children?: ReactNode }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={onPress}
      style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48 }}>
      <View style={{ width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: on ? color.blue : color.white, borderWidth: on ? 0 : 2, borderColor: "#C9C9C2" }}>
        {on ? <Icon name="check" size={16} stroke={color.white} width={2.6} /> : null}
      </View>
      {label ? <T v="bodyBold" style={{ flex: 1 }}>{label}</T> : children}
    </Pressable>
  );
}

// 리포트 아이콘 타일 (AI가 고른 아이콘, 없으면 첫 글자)
export function IconTile({ icon, title, size: s = 44 }: { icon?: string | null; title: string; size?: number }) {
  return (
    <View style={{ width: s, height: s, borderRadius: 12, backgroundColor: color.blueSoft, alignItems: "center", justifyContent: "center" }}>
      {icon && TOPIC_ICONS.has(icon)
        ? <Icon name={icon as IconName} size={s * 0.5} stroke={color.blue} />
        : <Text style={{ fontFamily: font.title, fontSize: s * 0.42, color: color.blue }}>{title.slice(0, 1)}</Text>}
    </View>
  );
}

// 가로 진행 막대
export function ProgressBar({ value, label }: { value: number; label?: string }) {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      style={{ height: 8, borderRadius: radius.pill, backgroundColor: "#E2E8F4", overflow: "hidden" }}>
      <View style={{ width: `${Math.round(value * 100)}%`, height: "100%", backgroundColor: color.blue, borderRadius: radius.pill }} />
    </View>
  );
}

// 4주 막대 (항목이 얼마나 언급됐는지). 마지막 주만 단계 색.
export function WeekBars({ values, stage = "rising", height = 44 }: { values: number[]; stage?: string; height?: number }) {
  const max = Math.max(1, ...values);
  const last = (stageColor[stage] ?? stageColor.rising)[2];
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 5, height }} accessibilityLabel={`지난 ${values.length}주 언급 흐름: ${values.join(", ")}`}>
      {values.map((v, i) => (
        <View key={i} style={{ width: 14, height: Math.max(3, Math.round((height * v) / max)), borderTopLeftRadius: 4, borderTopRightRadius: 4, borderBottomLeftRadius: 2, borderBottomRightRadius: 2, backgroundColor: i === values.length - 1 ? last : color.barIdle }} />
      ))}
    </View>
  );
}

// 단계 태그 (새로 등장 · 뜨는 중 · 정점 · 식는 중)
export const STAGE_LABEL: Record<string, string> = { new: "새로 등장", rising: "뜨는 중", peak: "정점", cooling: "식는 중" };
export function StageTag({ stage }: { stage: string }) {
  const [bg, fg] = stageColor[stage] ?? stageColor.rising;
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: bg, flexShrink: 0 }}>
      <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: fg }}>{STAGE_LABEL[stage] ?? stage}</Text>
    </View>
  );
}

// 아래 탭 (리포트 · 만들기)
export function BottomNav({ active }: { active: "reports" | "create" }) {
  const inset = useSafeAreaInsets();
  const tab = (key: "reports" | "create", label: string, icon: IconName, href: "/" | "/create") => {
    const on = active === key;
    return (
      <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => !on && router.replace(href === "/" ? "/home" : "/create")}
        style={{ flex: 1, height: 46, borderRadius: radius.pill, backgroundColor: on ? color.blue : "transparent", flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={18} stroke={on ? color.white : color.ink} />
        <T v="smallBold" c={on ? color.white : color.ink}>{label}</T>
      </Pressable>
    );
  };
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: "row", gap: 6, marginHorizontal: 16, marginBottom: Math.max(inset.bottom, 12) + 8, padding: 5, borderWidth: 2, borderColor: color.blue, borderRadius: radius.pill, backgroundColor: color.white }}>
      {tab("reports", "리포트", "list", "/")}
      {tab("create", "만들기", "plus", "/create")}
    </View>
  );
}

export function Spacer() {
  return <View style={{ flexGrow: 1 }} />;
}
