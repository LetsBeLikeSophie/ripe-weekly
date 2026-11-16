-- 지시문(prompt)은 사용자가 직접 못 고치게: 생성·지시문 변경은 서버(엣지 함수)만
revoke insert, update on trend.topics from authenticated;
grant update (enabled, cron, timezone, icon, icon_source, title) on trend.topics to authenticated;
drop policy if exists topics_insert_own on trend.topics;
