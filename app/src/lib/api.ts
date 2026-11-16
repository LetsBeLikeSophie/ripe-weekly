// 서버와 주고받는 것 전부. 화면은 여기 함수만 부른다.
import { Platform } from "react-native";
import { db, supabase } from "./supabase";

export type Stage = "new" | "rising" | "peak" | "cooling";
export type ReportItem = {
  ref?: number; name: string; stage: Stage; desc: string; angle: string | null;
  term: { word: string; meaning: string } | null; link: string | null; sources: { title: string; url: string }[];
};
export type ReportPayload = { headline: string; tldr: string; quiet: boolean; items: ReportItem[]; watch_next: string };
export type Report = {
  id: string; topic_id: string; status: "queued" | "running" | "succeeded" | "failed" | "skipped";
  title: string | null; summary: string | null; payload: ReportPayload | null; error: string | null; is_read: boolean;
  docs_read: number | null; sources_count: number | null; source_breakdown: Record<string, number>;
  created_at: string; finished_at: string | null; started_at: string | null;
};
export type Topic = {
  id: string; title: string; user_request: string; prompt: string; cron: string; timezone: string; enabled: boolean;
  next_run_at: string | null; last_run_at: string | null; icon: string | null; summary_tags: string[]; depth: string; regions: string[];
};
export type Profile = { user_id: string; country: string | null; language: string; timezone: string; plan: "trial" | "basic" | "plus" | "expired"; trial_ends_at: string | null; channels: string[] };

// ---------- 로그인 ----------
// 첫 리포트는 로그인 없이 받는다: 익명 계정으로 시작했다가 카카오·구글로 로그인하면 같은 계정에 붙인다.
export async function ensureSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;
  const { data: anon, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  await ensureProfile();
  return anon.session;
}

export async function ensureProfile() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Seoul";
  const lang = (Intl.DateTimeFormat().resolvedOptions().locale || "ko").slice(0, 2);
  await db().from("profiles").upsert(
    { user_id: u.user.id, timezone: tz, language: lang, country: lang === "ko" ? "KR" : null },
    { onConflict: "user_id", ignoreDuplicates: true },
  );
}

export async function isAnonymous() {
  const { data } = await supabase.auth.getUser();
  return !!data.user?.is_anonymous;
}

// 카카오·구글: 익명 계정이면 그 계정에 연결(linkIdentity), 아니면 그냥 로그인
export async function signInWith(provider: "kakao" | "google", redirectTo: string) {
  const anon = await isAnonymous();
  const opts = { redirectTo, skipBrowserRedirect: Platform.OS !== "web", scopes: provider === "kakao" ? "talk_message" : undefined };
  const res = anon ? await supabase.auth.linkIdentity({ provider, options: opts }) : await supabase.auth.signInWithOAuth({ provider, options: opts });
  if (res.error) throw res.error;
  return res.data?.url ?? null;
}

export async function signOut() {
  await supabase.auth.signOut();
}

// ---------- 동의 ----------
export const DOC_VERSION = "2027-01-v1";
export async function saveConsents(kinds: { kind: string; agreed: boolean }[]) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  await db().from("consents").insert(kinds.map((k) => ({ user_id: u.user!.id, kind: k.kind, agreed: k.agreed, doc_version: DOC_VERSION })));
}

// ---------- 리포트 설정 ----------
export type CreateResult = { clarify?: { question: string; options: string[] }; topic?: Pick<Topic, "id" | "title" | "icon" | "summary_tags" | "cron">; error?: string; code?: string };
export async function createTopic(request: string, clarification_answer?: string): Promise<CreateResult> {
  await ensureSession();
  const { data, error } = await supabase.functions.invoke("ripe-create", { body: { request, clarification_answer } });
  if (error) return { error: await readError(error) };
  return data as CreateResult;
}

export async function runTopic(topic_id: string): Promise<{ report_id?: string; error?: string; code?: string }> {
  const { data, error } = await supabase.functions.invoke("ripe-run", { body: { topic_id } });
  if (error) return { error: await readError(error) };
  return data;
}

async function readError(error: any) {
  try { const body = await error.context?.json?.(); return body?.error ?? String(error.message); } catch { return String(error?.message ?? error); }
}

export async function listTopics(): Promise<Topic[]> {
  const { data, error } = await db().from("topics").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return data as Topic[];
}
export async function getTopic(id: string): Promise<Topic | null> {
  const { data } = await db().from("topics").select("*").eq("id", id).maybeSingle();
  return data as Topic | null;
}
export async function updateTopic(id: string, patch: Partial<Pick<Topic, "enabled" | "cron" | "timezone" | "title" | "icon">>) {
  const { error } = await db().from("topics").update(patch).eq("id", id);
  if (error) throw error;
}
export async function deleteTopic(id: string) {
  const { error } = await db().from("topics").delete().eq("id", id);
  if (error) throw error;
}

// ---------- 리포트 ----------
export async function listReports(topicId?: string): Promise<Report[]> {
  let q = db().from("reports").select("*").order("created_at", { ascending: false }).limit(50);
  if (topicId) q = q.eq("topic_id", topicId);
  const { data, error } = await q;
  if (error) throw error;
  return data as Report[];
}
export async function getReport(id: string): Promise<Report | null> {
  const { data } = await db().from("reports").select("*").eq("id", id).maybeSingle();
  return data as Report | null;
}
export async function markRead(id: string) {
  await db().from("reports").update({ is_read: true }).eq("id", id);
}

// 리포트 항목들의 최근 4주 언급 수(막대)와 트렌드 곡선 위 위치
export type ItemTrend = { mentions: number[]; pos: number | null };
export async function itemTrends(topicId: string): Promise<Record<string, ItemTrend>> {
  const { data } = await db().from("items").select("name, item_snapshots(mentions, curve_pos, created_at)").eq("topic_id", topicId);
  const out: Record<string, ItemTrend> = {};
  for (const it of (data ?? []) as any[]) {
    const snaps = [...(it.item_snapshots ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at)).slice(-4);
    const last = snaps[snaps.length - 1];
    out[it.name] = { mentions: snaps.map((s) => s.mentions ?? 0), pos: last?.curve_pos != null ? Number(last.curve_pos) : null };
  }
  return out;
}

// ---------- 반응 ----------
export async function sendFeedback(report_id: string, value: string, kind: "chip" | "thumb" | "text" = "chip", item_key?: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  await db().from("feedback").insert({ report_id, user_id: u.user.id, kind, value, item_key });
}

// ---------- 프로필 ----------
export async function getProfile(): Promise<Profile | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data } = await db().from("profiles").select("*").eq("user_id", u.user.id).maybeSingle();
  return data as Profile | null;
}
export async function updateProfile(patch: Partial<Pick<Profile, "language" | "timezone" | "country" | "channels">>) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  await db().from("profiles").update(patch).eq("user_id", u.user.id);
}

// ---------- 지시문 고치기 (서버만 지시문을 바꾼다) ----------
export type PromptVersion = { id: string; reason: string; summary: string | null; created_at: string };
export async function listPromptVersions(topicId: string): Promise<PromptVersion[]> {
  const { data } = await db().from("prompt_versions").select("id, reason, summary, created_at").eq("topic_id", topicId).order("created_at", { ascending: false }).limit(20);
  return (data ?? []) as PromptVersion[];
}
export type FixPreview = { changes: { kind: "remove" | "add" | "keep"; text: string }[]; summary: string; preview_id: string; from_date?: string | null };
export async function previewFix(topic_id: string, instruction: string): Promise<FixPreview & { error?: string }> {
  const { data, error } = await supabase.functions.invoke("ripe-fix", { body: { topic_id, instruction } });
  if (error) return { error: await readError(error), changes: [], summary: "", preview_id: "" };
  return data;
}
export async function applyFix(topic_id: string, preview_id: string) {
  const { error } = await supabase.functions.invoke("ripe-fix", { body: { topic_id, apply: preview_id } });
  if (error) throw new Error(await readError(error));
}
export async function revertPrompt(topic_id: string, version_id: string) {
  const { error } = await supabase.functions.invoke("ripe-fix", { body: { topic_id, revert_to: version_id } });
  if (error) throw new Error(await readError(error));
}

// ---------- 동의 (가장 최근 값) ----------
export async function getConsents(): Promise<Record<string, boolean>> {
  const { data } = await db().from("consents").select("kind, agreed, created_at").order("created_at", { ascending: false }).limit(100);
  const out: Record<string, boolean> = {};
  for (const r of data ?? []) if (!(r.kind in out)) out[r.kind] = r.agreed;
  return out;
}

// ---------- 물어보기 ----------
export type AskMessage = { id: string; role: "user" | "assistant"; content: string; created_at: string };
export async function listAsk(report_id: string): Promise<AskMessage[]> {
  const { data } = await db().from("ask_messages").select("id, role, content, created_at").eq("report_id", report_id).order("created_at");
  return (data ?? []) as AskMessage[];
}
export async function ask(report_id: string, question: string): Promise<{ answer?: string; remaining?: number; suggestions?: string[]; error?: string; code?: string }> {
  const { data, error } = await supabase.functions.invoke("ripe-ask", { body: { report_id, question } });
  if (error) { const msg = await readError(error); return { error: msg, code: (error as any)?.context?.status === 429 ? "limit" : undefined }; }
  return data;
}
export async function askRemaining(): Promise<{ remaining: number; limit: number; resets_at: string }> {
  const { data } = await supabase.functions.invoke("ripe-ask", { body: { remaining: true } });
  return data ?? { remaining: 0, limit: 10, resets_at: new Date().toISOString() };
}

// ---------- 기억하는 내 상황 ----------
export type Memory = { id: string; text: string; source: string | null; created_at: string };
export async function listMemories(): Promise<Memory[]> {
  const { data } = await db().from("memories").select("id, text, source, created_at").order("created_at", { ascending: false });
  return (data ?? []) as Memory[];
}
export async function deleteMemory(id?: string) {
  const q = db().from("memories").delete();
  await (id ? q.eq("id", id) : q.not("id", "is", null));
}

// ---------- 내 데이터 · 탈퇴 ----------
export async function myDataCounts() {
  const c = async (t: string) => (await db().from(t).select("id", { count: "exact", head: true })).count ?? 0;
  const [topics, reports, asks, memories] = await Promise.all([c("topics"), c("reports"), c("ask_messages"), c("memories")]);
  return { topics, reports, asks, memories };
}
export async function exportMyData(): Promise<string> {
  const { data, error } = await supabase.functions.invoke("ripe-account", { body: { action: "export" } });
  if (error) throw new Error(await readError(error));
  return JSON.stringify(data, null, 2);
}
export async function withdraw() {
  const { error } = await supabase.functions.invoke("ripe-account", { body: { action: "delete" } });
  if (error) throw new Error(await readError(error));
  await supabase.auth.signOut();
}
