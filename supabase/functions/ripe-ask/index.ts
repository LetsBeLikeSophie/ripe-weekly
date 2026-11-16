// 리포트에 물어보기: 이번 리포트 내용(+출처)만 바탕으로 짧게 답한다. 한 달 횟수 제한 (체험·베이직 10, 플러스 30)
import { callClaude, cors, costUsd, extractJson, json, langName, languageOk, MODELS, resolveUser, sql } from "../_shared/shared.ts";

const LIMIT: Record<string, number> = { trial: 10, basic: 10, plus: 30, expired: 0 };

function monthStart(d = new Date()) { return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)); }
function nextMonth(d = new Date()) { return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)); }

async function remaining(userId: string) {
  const [p] = await sql`select plan from ripe.profiles where user_id = ${userId}`;
  const limit = LIMIT[p?.plan ?? "trial"] ?? 10;
  const [{ n }] = await sql`select count(*)::int as n from ripe.ask_messages where user_id = ${userId} and role = 'user' and created_at >= ${monthStart()}`;
  return { remaining: Math.max(0, limit - n), limit, resets_at: nextMonth().toISOString() };
}

const SYSTEM = (lang: string, remember: boolean) => `You answer a user's follow-up question about ONE weekly trend report.
Rules:
- Use ONLY the report JSON and its sources. If the report does not cover it, say so briefly and suggest what to watch.
- Answer in ${lang} only (Korean: polite 해요체). 2–5 short sentences, or a short "· " bullet list. Wrap at most one key phrase in **bold**.
- No investment, legal or medical advice. No made-up numbers.
- suggestions: 2 short follow-up questions the user might ask next, in ${lang}.
- memory: ${remember ? "if the user revealed a durable fact about their own situation (job, shop type, region, goal), restate it as one short sentence in " + lang + "; otherwise null." : "always null."}
Output exactly one JSON object and nothing else. Start your reply with "{".
{"answer": "", "suggestions": ["",""], "memory": null}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const userId = await resolveUser(req, body);
    if (!userId) return json({ error: "로그인이 필요해요" }, 401);
    if (body.remaining) return json(await remaining(userId));

    const reportId = String(body.report_id ?? "");
    const question = String(body.question ?? "").trim().slice(0, 500);
    if (!/^[0-9a-f-]{36}$/i.test(reportId) || !question) return json({ error: "질문을 적어 주세요" }, 400);

    const left = await remaining(userId);
    if (left.remaining <= 0) return json({ error: "이번 달 물어보기를 다 썼어요", ...left }, 429);

    const [r] = await sql`select r.id, r.topic_id, r.title, r.payload, t.title as topic_title from ripe.reports r join ripe.topics t on t.id = r.topic_id
      where r.id = ${reportId} and r.user_id = ${userId} and r.status = 'succeeded'`;
    if (!r) return json({ error: "리포트를 찾지 못했어요" }, 404);
    const [p] = await sql`select language from ripe.profiles where user_id = ${userId}`;
    const lang = p?.language ?? "ko";
    const [c] = await sql`select agreed from ripe.consents where user_id = ${userId} and kind = 'remember_context' order by created_at desc limit 1`;
    const remember = !!c?.agreed;
    const history = await sql`select role, content from ripe.ask_messages where report_id = ${reportId} order by created_at desc limit 6`;
    const mem = remember ? await sql`select text from ripe.memories where user_id = ${userId} order by created_at desc limit 10` : [];

    const res = await callClaude({
      model: MODELS.fast, maxTokens: 1500, system: SYSTEM(langName(lang), remember),
      user: JSON.stringify({ report: r.payload, topic: r.topic_title, user_context: mem.map((m: any) => m.text), recent_chat: history.reverse(), question }),
    });
    // JSON 이 아니면 글 자체를 답으로 쓴다 (제안·기억은 건너뜀)
    let out: any;
    try { out = extractJson<any>(res.text); } catch (_) { out = { answer: res.text.trim(), suggestions: [], memory: null }; }
    let cost = costUsd(MODELS.fast, res.inputTokens, res.outputTokens, 0);
    if (!languageOk(String(out.answer ?? ""), lang)) {
      const fix = await callClaude({ model: MODELS.fast, maxTokens: 1500, system: `Rewrite every string value of this JSON in ${langName(lang)}. Keep keys. JSON only.`, user: JSON.stringify(out) });
      try { out = extractJson<any>(fix.text); } catch (_) { /* 원래 답 유지 */ } cost += costUsd(MODELS.fast, fix.inputTokens, fix.outputTokens, 0);
    }
    const answer = String(out.answer ?? "").slice(0, 2000);
    if (!answer) throw new Error("답을 만들지 못했어요");

    await sql.begin(async (tx: any) => {
      await tx`insert into ripe.ask_messages (user_id, report_id, role, content) values (${userId}, ${reportId}, 'user', ${question})`;
      await tx`insert into ripe.ask_messages (user_id, report_id, role, content, cost_usd) values (${userId}, ${reportId}, 'assistant', ${answer}, ${cost})`;
      if (remember && out.memory && typeof out.memory === "string") {
        await tx`insert into ripe.memories (user_id, topic_id, text, source) values (${userId}, ${r.topic_id}, ${out.memory.slice(0, 200)}, ${r.topic_title})`;
      }
    });
    return json({ answer, suggestions: (out.suggestions ?? []).slice(0, 2).map(String), remaining: left.remaining - 1 });
  } catch (e) {
    console.error(e);
    return json({ error: "답을 만들지 못했어요. 잠시 뒤에 다시 해 주세요" }, 500);
  }
});
