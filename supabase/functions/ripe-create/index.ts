// ripe-create: 사용자가 한 말 → 리포트 설정(지시문 포함) 만들기. 부족하면 질문 하나 돌려줌.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { callClaude, cors, costUsd, extractJson, json, MODELS, nextRun, resolveUser, sql } from "../_shared/shared.ts";

const ICONS = ["cake", "coffee", "music", "house", "chart", "shopping-bag", "flask", "chip", "shirt", "sparkle", "plane", "book", "leaf", "game", "camera", "heart", "megaphone", "briefcase"];

const SYSTEM = `너는 "Ripe Weekly" 앱의 리포트 설계자다. 사용자가 한 말을 보고, 매주 많은 글을 읽어 "지금 상태"를 요약하는 정기 리포트 설정을 만든다.
반드시 JSON 하나만 출력한다. 설명 문장은 쓰지 않는다.

규칙
- 리포트를 만들려면 두 가지가 필요하다: (1) 어떤 분야인지 (2) 사용자가 어떤 입장인지(창업 준비, 가게 운영, 마케터·크리에이터, 연구자·학생, 그냥 관심 등).
- 둘 중 하나라도 모르겠고, 그 때문에 리포트 방향이 크게 달라진다면 needs_clarification=true 로 하고 질문 하나와 선택지 3~4개만 준다. 질문은 짧은 존댓말.
- 입장을 알면 눈높이(depth)는 네가 정한다. 단서가 없으면 easy.
- 이미 clarification_answer 가 주어졌으면 다시 묻지 않는다.
- title: 짧은 리포트 이름 (예: "디저트·카페", "AI 새 소식", "배터리 소재 연구"). 사용자 언어로.
- kind: trend | news | research | release | policy | market 중 하나 (어디서 읽을지 정하는 내부 값)
- regions: 조사할 나라 ISO 코드 배열. 말이 없으면 사용자 나라 + 해외에서 넘어오는 것을 보려면 "GLOBAL" 추가.
- research_key: 같은 주제를 다른 사람과 공유할 수 있게 짧은 영어 슬러그 + 지역 (예: "dessert-cafe|KR+GLOBAL"). 사람 고유 정보는 넣지 않는다.
- icon: 다음 중 하나 ${ICONS.join(", ")}
- cron: "분 시 * * 요일" (요일 0=일). 말이 없으면 "0 8 * * 2" (화요일 아침 8시).
- summary_tags: 화면에 보여 줄 짧은 태그 3~4개 (예: "창업 준비 관점", "한국 + 해외", "3분", "만드는 법 링크").
- prompt: 매주 실행할 상세 지시문. 다음을 반드시 포함한다:
  누구를 위한 리포트인지와 무엇을 판단하려고 보는지 / 조사 범위와 지역 / 지난 리포트에 나온 항목은 빼고 새로 등장하거나 크게 달라진 것만 / 항목마다 한 줄 설명, 단계(새로 등장·뜨는 중·정점·식는 중), 입장에 맞는 관점 한 줄, 있으면 링크 / 숫자는 출처가 있을 때만 / 블로그 글 하나만 근거인 항목은 빼기 / 새로운 게 없으면 억지로 채우지 않기 / 눈높이에 맞는 말투, 처음 보는 용어는 풀어 주기 / 분량 3분.

출력 형식
{"needs_clarification": false, "question": null, "options": [], "title": "", "kind": "trend", "depth": "easy|practitioner|expert", "regions": ["KR","GLOBAL"], "output_language": "ko", "research_key": "", "icon": "", "cron": "0 8 * * 2", "summary_tags": [], "prompt": ""}`;

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
      system: SYSTEM,
      maxTokens: 2000,
      user: JSON.stringify({ user_request: request, clarification_answer: answer, user_country: country, user_language: language }),
    });
    const spec = extractJson<any>(r.text);
    const cost = costUsd(MODELS.fast, r.inputTokens, r.outputTokens, 0);

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
          'generated', ${spec.kind ?? "trend"}, ${spec.depth ?? "easy"}, ${spec.regions ?? [country]}, ${spec.output_language ?? language},
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
