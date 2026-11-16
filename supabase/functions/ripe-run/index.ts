// ripe-run: 리포트 한 회차 만들기
//  - 사용자가 부르면 {topic_id}: 본인 리포트만, 바로 202 돌려주고 뒤에서 만든다
//  - 예약 실행은 x-cron-secret 헤더 + {due: true}: 시간이 된 리포트들을 돌린다
// 흐름: 공용 조사(같은 research_key 는 20시간 안 결과 재사용) → 사람마다 관점 맞춰 쓰기 → 저장
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { callClaude, countSources, cors, costUsd, isInternal, parseOrRepair, searchDigest, json, MODELS, nextRun, resolveUser, sql } from "../_shared/shared.ts";

const REUSE_HOURS = 20;
const SEARCHES = { normal: 7, deep: 15 };

const RESEARCH_SYSTEM = `너는 트렌드 조사원이다. 주어진 주제와 지역에 대해 웹 검색으로 최근 7~14일 사이의 글을 많이 읽고, 지금 무엇이 새로 등장했고 커지고 정점이고 식는지 정리한다.
- 검색은 주제마다 따로, 지역 언어로 한다 (한국이면 한국어, 일본이면 일본어). 해외 흐름도 GLOBAL 이 있으면 본다.
- 출처는 언론, 공식 발표, 통계, 여러 SNS 반응을 우선한다. 블로그 하나만 근거인 항목은 넣지 않는다.
- 이미 다룬 항목(known_items)은 크게 달라진 경우에만 update=true 로 넣는다.
- 숫자는 출처에 있을 때만. 지어내지 않는다.
- 마지막에 JSON 하나만 출력한다.
{"items":[{"name":"","stage":"new|rising|peak|cooling","summary":"","why":"","update":false,"mentions":0,"curve_pos":0.3,"link":null,"sources":[{"title":"","url":""}]}],"quiet":false,"watch_next":"","source_breakdown":{"news":0,"sns":0,"overseas":0,"other":0}}
mentions 는 이번에 찾은 관련 글 수(대략), curve_pos 는 0(막 시작)~0.5(정점)~1(끝) 사이.`;

const WRITE_SYSTEM = `너는 "Ripe Weekly" 리포트 작가다. 조사 결과(findings)를 사용자의 리포트 지시문(prompt)에 맞춰 짧고 쉽게 다시 쓴다.
- 지시문의 입장·눈높이·언어를 따른다. 새로운 사실을 지어내지 않는다. findings 에 없는 건 쓰지 않는다.
- 헤드라인은 "지금 뜨는 중, 말차." 같은 짧은 한 줄.
- tldr 은 바쁜 사람용 한두 문장.
- 항목마다: name, stage(new|rising|peak|cooling), desc(1~2문장), angle(사용자 입장에서 한 줄, 없으면 null), term(처음 보는 용어 풀이, 없으면 null), link, sources.
- 새 항목이 없으면 quiet=true 로 하고 items 에는 지난 항목 업데이트만 짧게.
- JSON 하나만 출력한다.
{"headline":"","tldr":"","quiet":false,"items":[{"name":"","stage":"rising","desc":"","angle":null,"term":null,"link":null,"sources":[{"title":"","url":""}]}],"watch_next":""}`;

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
    const raw = r.text.trim() ? r.text : searchDigest(r.content);
    if (!raw.trim()) throw new Error(`조사 응답이 비었어요 (stop=${r.stopReason}, blocks=${r.blockTypes.slice(0, 300)})`);
    const rep = await parseOrRepair<any>(raw, RESEARCH_SYSTEM.slice(RESEARCH_SYSTEM.indexOf('{"items"')));
    const findings = rep.value;
    const { docsRead, sourcesCount } = countSources(r.content);
    const cost = costUsd(model, r.inputTokens, r.outputTokens, r.searches) + costUsd(MODELS.fast, rep.inTok, rep.outTok, 0);
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

function toMarkdown(p: any) {
  const stageKo: Record<string, string> = { new: "새로 등장", rising: "뜨는 중", peak: "정점", cooling: "식는 중" };
  const lines = [`# ${p.headline}`, "", `> ${p.tldr}`, ""];
  for (const it of p.items ?? []) {
    lines.push(`## ${it.name} · ${stageKo[it.stage] ?? it.stage}`, it.desc ?? "");
    if (it.angle) lines.push(`- ${it.angle}`);
    if (it.term) lines.push(`- 용어 풀이: ${it.term}`);
    if (it.link) lines.push(`- ${it.link}`);
    lines.push("");
  }
  if (p.watch_next) lines.push(`**다음에 지켜볼 것** ${p.watch_next}`);
  return lines.join("\n");
}

async function runTopic(topicId: string, reportId: string) {
  const [topic] = await sql`select * from ripe.topics where id = ${topicId}`;
  const known = (await sql`select name from ripe.items where topic_id = ${topicId} order by first_seen_at desc limit 40`).map((r: any) => r.name);
  try {
    const { run, reused } = await research(topic, known);
    const w = await callClaude({
      model: MODELS.fast,
      system: WRITE_SYSTEM,
      maxTokens: 3000,
      user: JSON.stringify({ prompt: topic.prompt, depth: topic.depth, language: topic.output_language, known_items: known, findings: run.findings }),
    });
    const wp = await parseOrRepair<any>(w.text, WRITE_SYSTEM.slice(WRITE_SYSTEM.indexOf('{"headline"')));
    const payload = wp.value;
    const writeCost = costUsd(MODELS.fast, w.inputTokens + wp.inTok, w.outputTokens + wp.outTok, 0);
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
      const fItems = new Map((run.findings?.items ?? []).map((f: any) => [f.name, f]));
      for (const it of payload.items ?? []) {
        if (!it?.name) continue;
        const [item] = await tx`
          insert into ripe.items (topic_id, user_id, name) values (${topicId}, ${topic.user_id}, ${String(it.name).slice(0, 120)})
          on conflict (topic_id, name) do update set name = excluded.name returning id`;
        const f: any = fItems.get(it.name) ?? {};
        const stage = ["new", "rising", "peak", "cooling"].includes(it.stage) ? it.stage : "rising";
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
