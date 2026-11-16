// ripe-create: 사용자가 한 말 → 리포트 설정(지시문 포함) 만들기. 부족하면 질문 하나 돌려줌.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { callClaude, cors, costUsd, extractJson, json, langName, languageOk, MODELS, nextRun, resolveUser, sql } from "../_shared/shared.ts";

const ICONS = ["cake", "coffee", "music", "house", "chart", "shopping-bag", "flask", "chip", "shirt", "sparkle", "plane", "book", "leaf", "game", "camera", "heart", "megaphone", "briefcase"];

const SYSTEM = (lang: string) => `You design a recurring report for the app "Ripe Weekly". The app reads many recent articles every week and summarizes the current state of a field for one user.
Output exactly one JSON object and nothing else.

LANGUAGE: every user-facing string (question, options, title, summary_tags, prompt) must be written in ${lang}. Proper nouns may keep their original spelling.

Rules
- A report needs two things: (1) the field, (2) the user's standpoint (e.g. preparing to open a shop, running a shop, online seller, marketer or creator, researcher or student, just curious).
- If either is missing AND it would change the report a lot, set needs_clarification=true and give ONE short polite question with 3-4 options. Otherwise do not ask.
- If clarification_answer is given, never ask again.
- depth: easy | practitioner | expert. Decide it from the standpoint; default easy.
- kind: trend | news | research | release | policy | market (internal value).
- regions: ISO country codes to research. Default: the user's country, plus "GLOBAL" when things abroad usually reach the user's market first.
- research_key: short English slug of the field + regions, shared between users with the same field (e.g. "<field-slug>|KR+GLOBAL"). No personal details.
- icon: one of ${ICONS.join(", ")}.
- cron: "minute hour * * weekday" (0=Sunday). Default "0 8 * * 2".
- title: 2-12 characters/words, built from the user's own words.
- summary_tags: 3-4 very short tags describing THIS report (standpoint, regions, reading time, extras the user asked for). Build them from the request. Never copy wording from these instructions.
- prompt: the detailed weekly instruction (internal, but the user can read it). It must state:
  who the report is for and what decision they make with it; scope and regions;
  only items that are new or changed a lot since last time;
  per item: what it is in 1-2 sentences, stage (new / rising / peak / cooling), one line on what it means for this user's standpoint, a source link;
  evidence: an item needs at least two independent sources; a single brand's product counts only as an example of a wider trend;
  overseas items only when they are likely to reach the user's market, and say why;
  explain a technical term only if it is actually used in the text;
  numbers only with a source; if nothing new, say so instead of filling space;
  tone for the depth level; about 3 minutes to read; written in ${lang}.

Output shape
{"needs_clarification": false, "question": null, "options": [], "title": "", "kind": "trend", "depth": "easy", "regions": [], "output_language": "", "research_key": "", "icon": "", "cron": "0 8 * * 2", "summary_tags": [], "prompt": ""}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const userId = await resolveUser(req, body);
    if (!userId) return json({ error: "로그인이 필요해요" }, 401);
    const request = String(body.request ?? "").trim().slice(0, 1000);
    const answer = body.clarification_answer ? String(body.clarification_answer).slice(0, 300) : null;
    if (!request) return json({ error: "궁금한 걸 한 줄이라도 적어 주세요" }, 400);

    const [profile] = await sql`select country, language, timezone from ripe.profiles where user_id = ${userId}`;
    const country = profile?.country ?? "KR";
    const language = profile?.language ?? "ko";
    const tz = profile?.timezone ?? "Asia/Seoul";

    const r = await callClaude({
      model: MODELS.fast,
      system: SYSTEM(langName(language)),
      maxTokens: 2000,
      user: JSON.stringify({ user_request: request, clarification_answer: answer, user_country: country, user_language: language }),
    });
    let spec = extractJson<any>(r.text);
    let cost = costUsd(MODELS.fast, r.inputTokens, r.outputTokens, 0);
    // 사용자 언어가 아니면 한 번 다시 쓰게 한다
    const visible = [spec.question, ...(spec.options ?? []), spec.title, ...(spec.summary_tags ?? []), spec.prompt].filter(Boolean).join(" ");
    if (!languageOk(visible, language)) {
      const fix = await callClaude({
        model: MODELS.fast, maxTokens: 2500,
        system: `Rewrite every string value of this JSON in ${langName(language)}. Keep keys, enums (kind, depth, icon, cron, regions, research_key) and meaning unchanged. Output the JSON only.`,
        user: JSON.stringify(spec),
      });
      spec = extractJson<any>(fix.text);
      cost += costUsd(MODELS.fast, fix.inputTokens, fix.outputTokens, 0);
    }

    if (spec.needs_clarification && !answer) {
      await sql`insert into ripe.events (user_id, event, props) values (${userId}, 'clarify_shown', ${sql.json({ request, question: spec.question, cost_usd: cost })})`;
      return json({ clarify: { question: spec.question, options: (spec.options ?? []).slice(0, 4) } });
    }

    const icon = ICONS.includes(spec.icon) ? spec.icon : null;
    const cron = /^\d{1,2} \d{1,2} \* \* [\d,*]+$/.test(spec.cron ?? "") ? spec.cron : "0 8 * * 2";
    const userRequest = answer ? `${request}\n(답: ${answer})` : request;
    spec.kind = ["trend", "news", "research", "release", "policy", "market"].includes(spec.kind) ? spec.kind : "trend";
    spec.depth = ["easy", "practitioner", "expert"].includes(spec.depth) ? spec.depth : "easy";
    if (!spec.prompt || !spec.title) throw new Error("리포트 설정을 만들지 못했어요");

    const topic = await sql.begin(async (tx) => {
      const [t] = await tx`
        insert into ripe.topics (user_id, title, user_request, prompt, cron, timezone, enabled, next_run_at,
          prompt_source, kind, depth, regions, output_language, research_key, icon, icon_source, summary_tags)
        values (${userId}, ${String(spec.title).slice(0, 60)}, ${userRequest}, ${spec.prompt}, ${cron}, ${tz}, true, now(),
          'generated', ${spec.kind ?? "trend"}, ${spec.depth ?? "easy"}, ${spec.regions ?? [country]}, ${language},
          ${spec.research_key ?? null}, ${icon}, ${icon ? "ai" : "fallback"}, ${(spec.summary_tags ?? []).slice(0, 4)})
        returning id, title, icon, summary_tags, cron`;
      await tx`insert into ripe.prompt_versions (topic_id, user_id, prompt, reason, summary)
        values (${t.id}, ${userId}, ${spec.prompt}, ${answer ? "clarified" : "created"}, '처음 만듦')`;
      await tx`insert into ripe.events (user_id, event, props) values (${userId}, 'topic_created', ${sql.json({ topic_id: t.id, cost_usd: cost })})`;
      return t;
    });

    return json({ topic, next_run_at: nextRun(cron, tz).toISOString() });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
