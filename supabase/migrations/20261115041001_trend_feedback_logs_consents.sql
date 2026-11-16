-- 지시문 출처 구분
alter table trend.topics
  add column prompt_source text not null default 'generated'
    check (prompt_source in ('generated','imported','manual'));

-- 비용·품질 추적용 (리포트 1건당)
alter table trend.reports
  add column model text,
  add column search_count integer,
  add column cost_usd numeric(10,5),
  add column prompt_version_id uuid;

-- 지시문 수정 이력 (되돌리기 + 어떤 피드백이 무엇을 바꿨는지)
create table trend.prompt_versions (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references trend.topics(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt text not null,
  reason text not null check (reason in ('created','clarified','feedback','manual','import','revert')),
  summary text,                       -- 사람 말로 된 변경 요약 ("레시피 링크 추가")
  feedback_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create index prompt_versions_topic_idx on trend.prompt_versions (topic_id, created_at desc);
create index prompt_versions_user_idx on trend.prompt_versions (user_id);
alter table trend.reports
  add constraint reports_prompt_version_fk foreign key (prompt_version_id)
  references trend.prompt_versions(id) on delete set null;
create index reports_prompt_version_idx on trend.reports (prompt_version_id);

-- 리포트 피드백 (칩, 항목별 좋아요/싫어요, 리포트 속 질문에 대한 답)
create table trend.feedback (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references trend.reports(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('chip','thumb','answer','text')),
  item_key text,                      -- 항목별 피드백이면 항목 이름
  value text not null,                -- 'too_long', 'up', 'down', 자유 입력 등
  applied boolean not null default false,
  created_at timestamptz not null default now()
);
create index feedback_report_idx on trend.feedback (report_id);
create index feedback_user_idx on trend.feedback (user_id, created_at desc);
create index feedback_unapplied_idx on trend.feedback (created_at) where not applied;

-- 내부 고도화용 이벤트 로그 (사용자는 쓰기만, 읽기는 서버만)
create table trend.events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  event text not null,                -- 'topic_created', 'report_opened', 'clarify_shown' ...
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index events_event_created_idx on trend.events (event, created_at desc);
create index events_user_idx on trend.events (user_id);

-- 동의 기록 (어떤 버전의 약관·처리방침에 언제 동의했는지)
create table trend.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('terms','privacy','overseas_transfer','improvement_use','marketing','kakao_message')),
  agreed boolean not null,
  doc_version text not null,
  created_at timestamptz not null default now()
);
create index consents_user_kind_idx on trend.consents (user_id, kind, created_at desc);

-- RLS
alter table trend.prompt_versions enable row level security;
alter table trend.feedback enable row level security;
alter table trend.events enable row level security;
alter table trend.consents enable row level security;

create policy prompt_versions_select_own on trend.prompt_versions for select to authenticated
  using ((select auth.uid()) = user_id);

create policy feedback_select_own on trend.feedback for select to authenticated
  using ((select auth.uid()) = user_id);
create policy feedback_insert_own on trend.feedback for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from trend.reports r where r.id = report_id and r.user_id = (select auth.uid()))
  );

create policy events_insert_own on trend.events for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy consents_select_own on trend.consents for select to authenticated
  using ((select auth.uid()) = user_id);
create policy consents_insert_own on trend.consents for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- 권한
grant select on trend.prompt_versions to authenticated;
grant select, insert on trend.feedback to authenticated;
grant insert on trend.events to authenticated;
grant select, insert on trend.consents to authenticated;
grant all on trend.prompt_versions, trend.feedback, trend.events, trend.consents to service_role;
grant usage, select on all sequences in schema trend to service_role;
