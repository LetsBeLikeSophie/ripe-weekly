// ripe-run: 리포트 한 회차 만들기
//  - 사용자가 부르면 {topic_id}: 본인 리포트만, 바로 202 돌려주고 뒤에서 만든다
//  - 예약 실행은 x-cron-secret 헤더(Vault의 ripe_cron_secret) + {due: true}: 시간이 된 리포트들을 돌린다
// 흐름: 공용 조사(같은 research_key 는 20시간 안 결과 재사용) → 사람마다 관점 맞춰 쓰기 → 저장
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { callClaude, countSources, cors, costUsd, isInternal, parseOrRepair, searchDigest, json, extractJson, langName, languageOk, domainOf, MODELS, nextRun, resolveUser, sql } from "../_shared/shared.ts";

const REUSE_HOURS = 20;
const SEARCHES = { normal: 7, deep: 15 };

const RESEARCH_SCHEMA = `{"items":[{"name":"","stage":"new|rising|peak|cooling","summary":"","why_now":"","update":false,"overseas":false,"reaches_user_market":"likely|unlikely|unknown","mentions":0,"curve_pos":0.3,"sources":[{"title":"","url":""}]}],"quiet":false,"watch_next":"","source_breakdown":{"news":0,"sns":0,"overseas":0,"other":0}}`;

// 1단계: 검색하면서 메모 (인용이 붙는 자연스러운 글로). 2단계: 메모 + 인용 주소로 JSON 정리.
const RESEARCH_SYSTEM = `You are a trend researcher. For the given field and regions, use web search to read as many articles from the last 7-14 days as you can, then decide what is newly appearing, growing, at its peak, or cooling down.
- Search each sub-topic separately and in the local language of each region (Korean for KR, Japanese for JP, ...). Cover GLOBAL only if it is in regions.
- Prefer news outlets, official announcements, statistics and reactions across several social platforms.
- An item must be a trend, not a single launch: it needs at least two independent sources (different sites). A single brand's product only counts as an example inside a wider trend item.
- For overseas items, judge whether they are likely to reach the user's home region (the first region code).
- known_items were already reported. Mention one again only if it changed a lot.
- Numbers only when a source states them. Never invent anything.
- Write your findings as research notes in English: one short paragraph per item with its stage (new / rising / peak / cooling), why now, rough number of related articles, and cite every source you used.`;

const STRUCTURE_SYSTEM = `Convert the research notes into exactly one JSON object. Use only what the notes say. Each "[source: title | url]" marker belongs to the sentence before it: put those into that item's sources. Keep every url exactly. Write in English. Output the JSON only:
${RESEARCH_SCHEMA}
mentions = rough count of related articles. curve_pos = 0 (just started) .. 0.5 (peak) .. 1 (over). overseas = true for items outside the home region; reaches_user_market = likely | unlikely | unknown.`;

const WRITE_SCHEMA = `{"headline":"","tldr":"","quiet":false,"items":[{"ref":0,"name":"","stage":"rising","desc":"","angle":null,"term":null}],"watch_next":""}`;

const WRITE_SYSTEM = (lang: string) => `You write the weekly report for the app "Ripe Weekly". Rewrite the research findings for this user, following their report instruction (standpoint, depth, scope).

LANGUAGE: write every user-facing string (headline, tldr, name, desc, angle, term, watch_next) in ${lang} only. A proper noun may keep its original spelling in parentheses once. Use the polite, friendly register of that language (Korean: 해요체, Japanese: です/ます).

Rules
- Use only facts in findings. Add nothing.
- Drop findings items whose source_count is below 2, and overseas items whose reaches_user_market is "unlikely".
- headline: one short line about THIS week's single most important finding. Do not reuse any wording from these instructions.
- tldr: one or two sentences for a busy reader.
- per item: ref = index of the findings item it comes from; name; stage (new|rising|peak|cooling); desc in 1-2 sentences; angle = one line on what it means for this user's standpoint (null if nothing useful). Do not output sources or links; they are attached from findings by ref.
- term: {"word": "...", "meaning": "..."} only when that exact word appears in desc or angle and a reader at this depth may not know it. Otherwise null.
- watch_next: one sentence on what to watch next week.
- If nothing is new, set quiet=true and only give short updates on known items.
- Output exactly one JSON object:
${WRITE_SCHEMA}`;

async function research(topic: any, knownItems: string[]) {
  const key = topic.research_key ?? `topic-${topic.id}`;
  const [cached] = await sql`
    select * from ripe.research_runs
    where research_key = ${key} and status = 'succeeded' and finished_at > now() - make_interval(hours => ${REUSE_HOURS})
    order by finished_at desc limit 1`;
  if (cached) return { run: cached, reused: true };

  const deep = topic.depth === "expert";
  const model = MODELS.fast;
  const maxSearches = deep ? SEARCHES.deep : SEARCHES.normal;
  const [run] = await sql`insert into ripe.research_runs (research_key, model) values (${key}, ${model}) returning *`;
  try {
    const r = await callClaude({
      model,
      system: RESEARCH_SYSTEM,
      maxTokens: 8000,
      maxSearches,
      user: JSON.stringify({ topic: topic.title, kind: topic.kind, regions: topic.regions, research_key: key, known_items: knownItems, today: new Date().toISOString().slice(0, 10) }),
    });
    const notes = r.citedText.trim() ? r.citedText : searchDigest(r.content);
    if (!notes.trim()) throw new Error(`조사 응답이 비었어요 (stop=${r.stopReason}, blocks=${r.blockTypes.slice(0, 300)})`);
    const st = await callClaude({ model: MODELS.fast, system: STRUCTURE_SYSTEM, maxTokens: 8000, user: notes.slice(0, 80000) });
    const rep = await parseOrRepair<any>(st.text, RESEARCH_SCHEMA);
    const findings = rep.value;
    const { docsRead, sourcesCount } = countSources(r.content);
    const cost = costUsd(model, r.inputTokens + st.inputTokens, r.outputTokens + st.outputTokens, r.searches) + costUsd(MODELS.fast, rep.inTok, rep.outTok, 0);
    const [done] = await sql`
      update ripe.research_runs set status = 'succeeded', findings = ${sql.json(findings)}, docs_read = ${docsRead},
        sources_count = ${sourcesCount}, source_breakdown = ${sql.json(findings.source_breakdown ?? {})}, search_count = ${r.searches},
        input_tokens = ${r.inputTokens}, output_tokens = ${r.outputTokens}, cost_usd = ${cost}, finished_at = now()
      where id = ${run.id} returning *`;
    return { run: done, reused: false };
  } catch (e) {
    await sql`update ripe.research_runs set status = 'failed', error = ${String(e).slice(0, 1000)}, finished_at = now() where id = ${run.id}`;
    throw e;
  }
}

// 앱은 payload로 그린다. body_md는 메일·검색용 예비본 (언어 고정 문구 없음)
function toMarkdown(p: any) {
  const lines = [`# ${p.headline}`, "", `> ${p.tldr}`, ""];
  for (const it of p.items ?? []) {
    lines.push(`## ${it.name}`, it.desc ?? "");
    if (it.angle) lines.push(`- ${it.angle}`);
    if (it.term) lines.push(`- ${it.term.word}: ${it.term.meaning}`);
    if (it.link) lines.push(`- ${it.link}`);
    lines.push("");
  }
  if (p.watch_next) lines.push("---", p.watch_next);
  return lines.join("\n");
}

// 코드로 한 번 더 걸러내기: 출처 2곳 미만 항목 빼기, 본문에 없는 용어 풀이 빼기, 링크 채우기
// 출처·링크는 조사 결과(findings)에서 ref로 붙인다 (쓰는 단계는 출처를 다시 적지 않는다)
function clean(p: any, findings: any) {
  const fItems: any[] = findings?.items ?? [];
  const items = (Array.isArray(p?.items) ? p.items : []).map((it: any) => {
    const f = Number.isInteger(it?.ref) ? fItems[it.ref] : null;
    const sources = (f?.sources ?? []).filter((x: any) => x?.url);
    return { ...it, sources };
  }).filter((it: any) => {
    if (!it?.name) return false;
    const f = fItems[it.ref];
    if (f?.overseas && f?.reaches_user_market === "unlikely") return false;
    const domains = new Set(it.sources.map((x: any) => domainOf(x.url)).filter(Boolean));
    return domains.size >= 2;
  }).map((it: any) => {
    const text = `${it.desc ?? ""} ${it.angle ?? ""}`;
    const term = it.term && typeof it.term === "object" && it.term.word && text.includes(it.term.word) ? it.term : null;
    const link = it.sources[0]?.url ?? null;
    const stage = ["new", "rising", "peak", "cooling"].includes(it.stage) ? it.stage : "rising";
    return { ...it, stage, term, link };
  });
  return { ...p, items, quiet: items.length === 0 ? true : !!p?.quiet };
}
// 쓰는 단계에는 출처 목록 대신 출처 수만 넘긴다 (출력이 길어져 잘리는 것 방지)
function forWriter(findings: any) {
  return {
    ...findings,
    items: (findings?.items ?? []).map(({ sources, ...rest }: any, i: number) => ({
      ref: i, ...rest, source_count: new Set((sources ?? []).map((x: any) => domainOf(x?.url ?? "")).filter(Boolean)).size,
    })),
  };
}
function visibleText(p: any) {
  return [p.headline, p.tldr, p.watch_next, ...(p.items ?? []).flatMap((it: any) => [it.name, it.desc, it.angle, it.term?.meaning])]
    .filter(Boolean).join(" ");
}

async function runTopic(topicId: string, reportId: string) {
  const [topic] = await sql`select * from ripe.topics where id = ${topicId}`;
  const known = (await sql`select name from ripe.items where topic_id = ${topicId} order by first_seen_at desc limit 40`).map((r: any) => r.name);
  try {
    const { run, reused } = await research(topic, known);
    const w = await callClaude({
      model: MODELS.fast,
      system: WRITE_SYSTEM(langName(topic.output_language)),
      maxTokens: 12000,
      user: JSON.stringify({ prompt: topic.prompt, depth: topic.depth, language: topic.output_language, known_items: known, findings: forWriter(run.findings) }),
    });
    const wp = await parseOrRepair<any>(w.text, WRITE_SCHEMA);
    let payload = clean(wp.value, run.findings);
    let writeCost = costUsd(MODELS.fast, w.inputTokens + wp.inTok, w.outputTokens + wp.outTok, 0);
    // 사용자 언어 확인: 아니면 한 번 다시 쓰게 한다
    if (!languageOk(visibleText(payload), topic.output_language)) {
      const fix = await callClaude({
        model: MODELS.fast, maxTokens: 8000,
        system: `Rewrite every user-facing string of this JSON (headline, tldr, name, desc, angle, term.word, term.meaning, watch_next) in ${langName(topic.output_language)}. Keep ref, stage values and meaning unchanged. Output the JSON only.`,
        user: JSON.stringify({ ...payload, items: payload.items.map(({ sources: _s, link: _l, ...rest }: any) => rest) }),
      });
      payload = clean(extractJson<any>(fix.text), run.findings);
      writeCost += costUsd(MODELS.fast, fix.inputTokens, fix.outputTokens, 0);
      if (!languageOk(visibleText(payload), topic.output_language)) throw new Error("리포트를 사용자 언어로 맞추지 못했어요");
    }
    // 공용 조사를 새로 했으면 그 비용은 이 리포트에 붙이고, 재사용이면 쓰기 비용만
    const researchCost = reused ? 0 : Number(run.cost_usd ?? 0);
    const sources = (payload.items ?? []).flatMap((it: any) => it.sources ?? []).slice(0, 40);

    await sql.begin(async (tx) => {
      await tx`
        update ripe.reports set status = 'succeeded', title = ${payload.headline}, summary = ${payload.tldr},
          body_md = ${toMarkdown(payload)}, payload = ${tx.json(payload)}, sources = ${tx.json(sources)},
          research_run_id = ${run.id}, docs_read = ${run.docs_read}, sources_count = ${run.sources_count},
          source_breakdown = ${tx.json(run.source_breakdown ?? {})}, search_count = ${reused ? 0 : run.search_count},
          model = ${MODELS.fast}, input_tokens = ${w.inputTokens + (reused ? 0 : run.input_tokens ?? 0)},
          output_tokens = ${w.outputTokens + (reused ? 0 : run.output_tokens ?? 0)},
          cost_usd = ${researchCost + writeCost}, finished_at = now()
        where id = ${reportId}`;
      const fItems: any[] = run.findings?.items ?? [];
      for (const it of payload.items ?? []) {
        if (!it?.name) continue;
        const [item] = await tx`
          insert into ripe.items (topic_id, user_id, name) values (${topicId}, ${topic.user_id}, ${String(it.name).slice(0, 120)})
          on conflict (topic_id, name) do update set name = excluded.name returning id`;
        const f: any = (Number.isInteger(it.ref) ? fItems[it.ref] : null) ?? {};
        const stage = it.stage;
        const pos = typeof f.curve_pos === "number" ? Math.min(1, Math.max(0, f.curve_pos)) : null;
        const mentions = Number.isFinite(f.mentions) ? Math.round(f.mentions) : null;
        await tx`
          insert into ripe.item_snapshots (item_id, report_id, user_id, stage, mentions, curve_pos)
          values (${item.id}, ${reportId}, ${topic.user_id}, ${stage}, ${mentions}, ${pos})
          on conflict (item_id, report_id) do nothing`;
      }
      await tx`update ripe.topics set last_run_at = now(), next_run_at = ${nextRun(topic.cron, topic.timezone)} where id = ${topicId}`;
    });
  } catch (e) {
    console.error(e);
    await sql`update ripe.reports set status = 'failed', error = ${String(e).slice(0, 1000)}, finished_at = now() where id = ${reportId}`;
    await sql`update ripe.topics set next_run_at = now() + interval '1 hour' where id = ${topicId}`;
  }
}

async function startReport(topic: any) {
  const [rep] = await sql`
    insert into ripe.reports (topic_id, user_id, status, started_at)
    values (${topic.id}, ${topic.user_id}, 'running', now()) returning id`;
  return rep.id as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    if (body.due) {
      if (!(await isInternal(req))) return json({ error: "forbidden" }, 403);
      const due = await sql`
        select t.* from ripe.topics t
        join ripe.profiles p on p.user_id = t.user_id
        where t.enabled and t.next_run_at <= now() and p.plan in ('trial','basic','plus')
          and not exists (select 1 from ripe.reports r where r.topic_id = t.id and r.status = 'running' and r.started_at > now() - interval '30 minutes')
        order by t.next_run_at limit 5`;
      const started: string[] = [];
      for (const t of due) {
        const reportId = await startReport(t);
        started.push(reportId);
        EdgeRuntime.waitUntil(runTopic(t.id, reportId));
      }
      return json({ started }, 202);
    }

    const userId = await resolveUser(req, body);
    if (!userId) return json({ error: "로그인이 필요해요" }, 401);
    const topicId = String(body.topic_id ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(topicId)) return json({ error: "리포트를 찾지 못했어요" }, 404);
    const [prof] = await sql`select plan from ripe.profiles where user_id = ${userId}`;
    if (prof?.plan === "expired") return json({ error: "체험이 끝났어요", code: "trial_expired" }, 402);
    const [topic] = await sql`select * from ripe.topics where id = ${topicId} and user_id = ${userId}`;
    if (!topic) return json({ error: "리포트를 찾지 못했어요" }, 404);
    const [running] = await sql`select id from ripe.reports where topic_id = ${topicId} and status = 'running' and started_at > now() - interval '30 minutes'`;
    if (running) return json({ report_id: running.id, status: "running" }, 202);

    const reportId = await startReport(topic);
    EdgeRuntime.waitUntil(runTopic(topicId, reportId));
    return json({ report_id: reportId, status: "running" }, 202);
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
