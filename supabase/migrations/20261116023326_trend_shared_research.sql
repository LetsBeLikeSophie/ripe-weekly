-- 공용 조사: 같은 주제·지역은 한 번만 검색하고 사람마다 관점만 다시 쓴다
create table trend.research_runs (
  id uuid primary key default gen_random_uuid(),
  research_key text not null,              -- 예: 'dessert-cafe|KR+overseas'
  status text not null default 'running' check (status in ('running','succeeded','failed')),
  findings jsonb,                          -- 항목·출처 원자료
  docs_read integer,
  sources_count integer,
  source_breakdown jsonb not null default '{}'::jsonb,
  search_count integer,
  model text,
  input_tokens integer,
  output_tokens integer,
  cost_usd numeric(10,5),
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index research_runs_key_finished_idx on trend.research_runs (research_key, finished_at desc) where status = 'succeeded';
alter table trend.research_runs enable row level security;   -- 정책 없음 = 서버만
grant all on trend.research_runs to service_role;

alter table trend.topics
  add column research_key text,
  add column summary_tags text[] not null default '{}';
create index topics_research_key_idx on trend.topics (research_key);

alter table trend.reports
  add column research_run_id uuid references trend.research_runs(id) on delete set null,
  add column payload jsonb;                -- 화면에 그릴 구조화된 리포트 (헤드라인·항목·지켜볼 것)
create index reports_research_run_idx on trend.reports (research_run_id);
