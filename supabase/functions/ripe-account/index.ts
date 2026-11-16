// 내 데이터 내려받기 · 탈퇴 (탈퇴는 ripe 데이터를 지우고 계정을 삭제. 같은 프로젝트를 쓰는 다른 앱 데이터는 건드리지 않는다)
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { cors, getUserId, json, sql } from "../_shared/shared.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const userId = await getUserId(req); // 본인만 (내부 호출 불가)
    if (!userId) return json({ error: "로그인이 필요해요" }, 401);
    const body = await req.json().catch(() => ({}));

    if (body.action === "export") {
      const [profile] = await sql`select country, language, timezone, plan, trial_ends_at, channels, created_at from ripe.profiles where user_id = ${userId}`;
      const topics = await sql`select id, title, user_request, prompt, cron, timezone, enabled, created_at from ripe.topics where user_id = ${userId}`;
      const reports = await sql`select id, topic_id, status, title, payload, created_at from ripe.reports where user_id = ${userId}`;
      const asks = await sql`select report_id, role, content, created_at from ripe.ask_messages where user_id = ${userId}`;
      const memories = await sql`select text, source, created_at from ripe.memories where user_id = ${userId}`;
      const consents = await sql`select kind, agreed, doc_version, created_at from ripe.consents where user_id = ${userId}`;
      const feedback = await sql`select report_id, kind, value, created_at from ripe.feedback where user_id = ${userId}`;
      return json({ exported_at: new Date().toISOString(), profile, topics, reports, asks, memories, consents, feedback });
    }

    if (body.action === "delete") {
      // ripe 의 표는 모두 auth.users on delete cascade. 다른 앱도 같은 계정을 쓰면 계정은 남기고 ripe 데이터만 지운다.
      const others = await sql`select 1 from information_schema.columns c
        where c.column_name = 'user_id' and c.table_schema not in ('ripe','auth','storage','realtime','vault','pg_catalog','information_schema') limit 1`;
      await sql.begin(async (tx: any) => {
        for (const t of ["ask_messages", "memories", "push_tokens", "fix_previews", "feedback", "events", "item_snapshots", "items", "reports", "prompt_versions", "topics", "consents", "profiles"]) {
          await tx.unsafe(`delete from ripe.${t} where user_id = $1`, [userId]);
        }
      });
      const shared = others.length > 0;
      if (!shared) {
        const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        const { error } = await admin.auth.admin.deleteUser(userId);
        if (error) throw error;
      }
      return json({ ok: true, account_deleted: !shared });
    }
    return json({ error: "잘못된 요청이에요" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: "처리하지 못했어요. 잠시 뒤에 다시 해 주세요" }, 500);
  }
});
