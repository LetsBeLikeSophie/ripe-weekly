// 공용 도구: DB 연결, 사용자 확인, Claude 호출, JSON 꺼내기, 요금 계산, 언어 확인, 다음 실행 시각 계산
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

export const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false, max: 3 });

export const MODELS = {
  fast: "claude-haiku-5-5",
  deep: "claude-sonnet-5-5",
};

// 100만 토큰당 달러 (Haiku는 프롬프트 10만 토큰 이하 기준), 검색 1회 $0.01
const PRICE: Record<string, { in: number; out: number }> = {
  "claude-haiku-5-5": { in: 0.10, out: 0.50 },
  "claude-sonnet-5-5": { in: 2, out: 10 },
};
export function costUsd(model: string, inTok: number, outTok: number, searches: number) {
  const p = PRICE[model] ?? { in: 2, out: 10 };
  return (inTok * p.in + outTok * p.out) / 1_000_000 + searches * 0.01;
}

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};
export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

function publishableKey(): string {
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
    if (keys.default) return keys.default;
  } catch (_) { /* fall through */ }
  return Deno.env.get("SUPABASE_ANON_KEY") ?? "";
}

// 요청한 사람 확인. 로그인 안 했으면 null
export async function getUserId(req: Request): Promise<string | null> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, publishableKey());
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user.id;
}

// 내부 호출(예약 실행·관리자 테스트) 확인: x-cron-secret 헤더를 Vault 값과 비교
let cronSecretCache: string | null = null;
export async function isInternal(req: Request): Promise<boolean> {
  const got = req.headers.get("x-cron-secret");
  if (!got) return false;
  if (!cronSecretCache) {
    const [row] = await sql`select decrypted_secret from vault.decrypted_secrets where name = 'ripe_cron_secret'`;
    cronSecretCache = row?.decrypted_secret ?? null;
  }
  if (!cronSecretCache || got.length !== cronSecretCache.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ cronSecretCache.charCodeAt(i);
  return diff === 0;
}

// 사용자 토큰, 또는 내부 호출이면 body.user_id
export async function resolveUser(req: Request, body: any): Promise<string | null> {
  const u = await getUserId(req);
  if (u) return u;
  if (body?.user_id && /^[0-9a-f-]{36}$/i.test(String(body.user_id)) && await isInternal(req)) return String(body.user_id);
  return null;
}

type Msg = { role: "user" | "assistant"; content: unknown };
export type ClaudeResult = {
  text: string;
  content: any[];
  inputTokens: number;
  outputTokens: number;
  searches: number;
  stopReason: string;
  blockTypes: string;
  citedText: string;
};

// Claude 호출. 검색 도구를 쓰면 pause_turn 이 올 수 있어서 이어서 부른다.
export async function callClaude(opts: {
  model: string;
  system: string;
  user: string;
  maxTokens: number;
  maxSearches?: number;
  userCountry?: string;
}): Promise<ClaudeResult> {
  const key = Deno.env.get("RIPE_ANTHROPIC_API_KEY");
  if (!key) throw new Error("RIPE_ANTHROPIC_API_KEY 가 설정되지 않았어요");
  const tools = opts.maxSearches
    ? [{
      type: "web_search_20250305",
      name: "web_search",
      max_uses: opts.maxSearches,
      ...(opts.userCountry ? { user_location: { type: "approximate", country: opts.userCountry } } : {}),
    }]
    : undefined;
  const messages: Msg[] = [{ role: "user", content: opts.user }];
  const all: any[] = [];
  let inTok = 0, outTok = 0, searches = 0, stopReason = "";
  for (let turn = 0; turn < 6; turn++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: opts.model, max_tokens: opts.maxTokens, system: opts.system, messages, ...(tools ? { tools } : {}) }),
    });
    if (!res.ok) throw new Error(`Claude API ${res.status}: ${(await res.text()).slice(0, 500)}`);
    const data = await res.json();
    inTok += data.usage?.input_tokens ?? 0;
    outTok += data.usage?.output_tokens ?? 0;
    searches += data.usage?.server_tool_use?.web_search_requests ?? 0;
    all.push(...(data.content ?? []));
    stopReason = data.stop_reason ?? "";
    if (data.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: data.content });
      continue;
    }
    break;
  }
  // 검색을 쓰면 답이 인용 단위로 여러 text 블록에 쪼개져 온다: 마지막 검색 결과 뒤의 text만 그대로 이어 붙인다
  let lastTool = -1;
  all.forEach((b, i) => { if (b.type === "web_search_tool_result" || b.type === "server_tool_use") lastTool = i; });
  let text = all.slice(lastTool + 1).filter((b) => b.type === "text").map((b) => b.text).join("");
  if (!text.trim()) text = all.filter((b) => b.type === "text").map((b) => b.text).join("");
  const blockTypes = all.map((b) => b.type).join(",");
  // 인용 정보(출처 주소)를 본문 옆에 붙인 판: 검색 결과를 정리할 때 쓴다
  const citedText = all.filter((b) => b.type === "text").map((b) => {
    const cites = (b.citations ?? []).filter((c: any) => c?.url).map((c: any) => `[source: ${c.title ?? ""} | ${c.url}]`);
    return cites.length ? `${b.text} ${[...new Set(cites)].join(" ")}` : b.text;
  }).join("");
  return { text, content: all, inputTokens: inTok, outputTokens: outTok, searches, stopReason, blockTypes, citedText };
}

// 답에서 JSON 꺼내기 (```json 블록 우선, 없으면 첫 { ~ 마지막 })
export function extractJson<T = any>(text: string): T {
  const fence = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)].map((m) => m[1]);
  const candidates = fence.length ? fence.reverse() : [];
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a >= 0 && b > a) candidates.push(text.slice(a, b + 1));
  for (const c of candidates) {
    try { return JSON.parse(c); } catch (_) { /* next */ }
  }
  throw new Error("응답에서 JSON을 찾지 못했어요");
}

// JSON 꺼내기 실패하면 싼 모델로 한 번 형식만 고쳐 받는다. 고친 비용도 돌려준다.
export async function parseOrRepair<T = any>(text: string, schema: string): Promise<{ value: T; inTok: number; outTok: number }> {
  try { return { value: extractJson<T>(text), inTok: 0, outTok: 0 }; } catch (_) { /* repair */ }
  if (!text.trim()) throw new Error("응답이 비어 있어요");
  const r = await callClaude({
    model: MODELS.fast,
    maxTokens: 6000,
    system: "주어진 글의 내용을 아래 JSON 형식으로만 옮겨 적는다. 내용을 더하거나 바꾸지 않는다. JSON 하나만 출력한다.\n" + schema,
    user: text.slice(0, 60000),
  });
  try { return { value: extractJson<T>(r.text), inTok: r.inputTokens, outTok: r.outputTokens }; }
  catch (_) { throw new Error("JSON 복구 실패: " + text.slice(-300)); }
}

// 답 글이 비었을 때 쓸 검색 결과 요약 (제목·주소·날짜)
export function searchDigest(content: any[]) {
  const lines: string[] = [];
  for (const b of content) {
    if (b.type === "text" && b.text?.trim()) lines.push(b.text);
    if (b.type !== "web_search_tool_result" || !Array.isArray(b.content)) continue;
    for (const r of b.content) if (r?.url) lines.push(`- ${r.title ?? ""} | ${r.url} | ${r.page_age ?? ""}`);
  }
  return lines.join("\n");
}

// ---- 언어 ----
export const LANG_NAMES: Record<string, string> = {
  ko: "Korean", en: "English", ja: "Japanese", zh: "Chinese", es: "Spanish", fr: "French", de: "German",
  pt: "Portuguese", it: "Italian", vi: "Vietnamese", th: "Thai", id: "Indonesian",
};
export function langName(code: string) {
  return LANG_NAMES[(code || "en").slice(0, 2).toLowerCase()] ?? "English";
}
const SCRIPT: Record<string, RegExp> = {
  ko: /[\uAC00-\uD7A3]/g,
  ja: /[\u3040-\u30FF\u4E00-\u9FFF]/g,
  zh: /[\u4E00-\u9FFF]/g,
  th: /[\u0E00-\u0E7F]/g,
};
const CJK = /[\uAC00-\uD7A3\u3040-\u30FF\u4E00-\u9FFF]/g;
// 사용자 언어 글자 비율로 확인. 라틴 문자 언어는 한중일 글자가 거의 없어야 통과
export function languageOk(text: string, code: string) {
  const letters = (text.match(/\p{L}/gu) ?? []).length;
  if (letters < 10) return true;
  const c = (code || "en").slice(0, 2).toLowerCase();
  const re = SCRIPT[c];
  if (re) return (text.match(re) ?? []).length / letters >= 0.5;
  return (text.match(CJK) ?? []).length / letters <= 0.05;
}

// 검색 결과 블록에서 실제로 읽은 문서 수·출처 수 세기
export function domainOf(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch (_) { return ""; }
}

export function countSources(content: any[]) {
  const urls = new Set<string>();
  const domains = new Set<string>();
  for (const b of content) {
    if (b.type !== "web_search_tool_result" || !Array.isArray(b.content)) continue;
    for (const r of b.content) {
      if (!r?.url) continue;
      urls.add(r.url);
      try { domains.add(new URL(r.url).hostname.replace(/^www\./, "")); } catch (_) { /* skip */ }
    }
  }
  return { docsRead: urls.size, sourcesCount: domains.size };
}

// "분 시 * * 요일들" 형식의 다음 실행 시각 (사용자 시간대 기준)
function tzOffsetMs(date: Date, tz: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
      .formatToParts(date).map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUtc - date.getTime();
}
export function nextRun(cron: string, tz: string, from = new Date()): Date {
  const [mi, h, , , dow] = cron.trim().split(/\s+/);
  const minute = +mi, hour = +h;
  const days = dow === "*" ? [0, 1, 2, 3, 4, 5, 6] : dow.split(",").map(Number);
  for (let i = 0; i <= 8; i++) {
    const probe = new Date(from.getTime() + i * 86400000);
    const local = new Date(probe.getTime() + tzOffsetMs(probe, tz));
    if (!days.includes(local.getUTCDay())) continue;
    const guess = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), hour, minute);
    const at = new Date(guess - tzOffsetMs(new Date(guess), tz));
    if (at.getTime() > from.getTime() + 60000) return at;
  }
  return new Date(from.getTime() + 7 * 86400000);
}
