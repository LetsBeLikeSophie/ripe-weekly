// 날짜·요일 표시 (한국어). 해외 출시 때 이 파일을 언어별로 나눈다.
const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function md(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, "0")}`;
}
export function monthDay(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

// "0 8 * * 2" → { days: [2], hour: 8, minute: 0 }
export function parseCron(cron: string) {
  const [mi, h, , , dow] = cron.trim().split(/\s+/);
  return { minute: +mi, hour: +h, days: dow === "*" ? [0, 1, 2, 3, 4, 5, 6] : dow.split(",").map(Number) };
}
export function makeCron(days: number[], hour: number, minute = 0) {
  return `${minute} ${hour} * * ${[...days].sort().join(",") || "2"}`;
}
export function hourLabel(h: number) {
  if (h < 12) return `아침 ${h === 0 ? 12 : h}시`;
  if (h < 18) return `오후 ${h === 12 ? 12 : h - 12}시`;
  return `저녁 ${h - 12}시`;
}
// "매주 화 · 아침 8시"
export function scheduleLabel(cron: string) {
  const c = parseCron(cron);
  const d = c.days.length === 7 ? "매일" : `매주 ${c.days.map((x) => DAYS[x]).join("·")}`;
  return `${d} · ${hourLabel(c.hour)}`;
}
export { DAYS };
