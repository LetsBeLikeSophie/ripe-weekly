create schema if not exists trend;
comment on schema trend is '트렌드 리포트 앱 (camtrip 안에 임시로 분리)';

-- 사용자가 만든 리포트 설정 (예약 작업 1개 = topic 1개)
create table trend.topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  user_request text not null,          -- 사용자가 처음 입력한 말 그대로
  prompt text not null,                -- AI가 만든 상세 실행 지시문
  cron text not null,                  -- 예: '43 8 * * 2,5'
  timezone text not null default 'Asia/Seoul',
  enabled boolean not null default true,
  next_run_at timestamptz,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index topics_user_id_idx on trend.topics (user_id);
create index topics_due_idx on trend.topics (next_run_at) where enabled;

-- 실행 결과 (앱에서 보여줄 리포트)
create table trend.reports (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references trend.topics(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued','running','succeeded','failed','skipped')),
  title text,
  summary text,
  body_md text,
  sources jsonb not null default '[]'::jsonb,
  error text,
  input_tokens integer,
  output_tokens integer,
  is_read boolean not null default false,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);
create index reports_topic_created_idx on trend.reports (topic_id, created_at desc);
create index reports_user_created_idx on trend.reports (user_id, created_at desc);

-- updated_at 자동 갱신
create function trend.set_updated_at() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger topics_set_updated_at before update on trend.topics
  for each row execute function trend.set_updated_at();

-- RLS: 본인 것만
alter table trend.topics enable row level security;
alter table trend.reports enable row level security;

create policy topics_select_own on trend.topics for select to authenticated
  using ((select auth.uid()) = user_id);
create policy topics_insert_own on trend.topics for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy topics_update_own on trend.topics for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy topics_delete_own on trend.topics for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy reports_select_own on trend.reports for select to authenticated
  using ((select auth.uid()) = user_id);
create policy reports_update_own on trend.reports for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- 권한: 앱 사용자는 본인 행만, 리포트는 읽기 + 읽음표시만
grant usage on schema trend to authenticated, service_role;
grant select, insert, update, delete on trend.topics to authenticated;
grant select on trend.reports to authenticated;
grant update (is_read) on trend.reports to authenticated;
grant all on all tables in schema trend to service_role;
revoke execute on function trend.set_updated_at() from public;
