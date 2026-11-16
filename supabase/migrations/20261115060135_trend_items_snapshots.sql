-- 리포트마다 "얼마나 읽었는지" (변동이 없어도 계속 찾고 있다는 걸 보여 주기)
alter table trend.reports
  add column docs_read integer,                 -- 읽은 글 수
  add column sources_count integer,             -- 출처(사이트·매체) 수
  add column source_breakdown jsonb not null default '{}'::jsonb;  -- {"news":41,"sns":63,"overseas":24}

-- 주제 안에서 계속 추적하는 항목 (말차 크림 디저트, 두쫀쿠 ...)
create table trend.items (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references trend.topics(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  aliases text[] not null default '{}',        -- 같은 걸 다르게 부르는 이름 (중복 판단)
  first_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (topic_id, name)
);
create index items_user_idx on trend.items (user_id);

-- 리포트마다 항목 상태 기록 → 그래프(4주 흐름, 트렌드 곡선 위치)의 재료
create table trend.item_snapshots (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references trend.items(id) on delete cascade,
  report_id uuid not null references trend.reports(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  stage text not null check (stage in ('new','rising','peak','cooling')),
  mentions integer,                            -- 이번 회차에 찾은 언급 수 (같은 방식으로 셀 때만 비교)
  curve_pos numeric(4,3) check (curve_pos between 0 and 1),  -- 트렌드 곡선 위 위치 0=시작, 0.5=정점, 1=끝
  created_at timestamptz not null default now(),
  unique (item_id, report_id)
);
create index item_snapshots_item_idx on trend.item_snapshots (item_id, created_at desc);
create index item_snapshots_report_idx on trend.item_snapshots (report_id);
create index item_snapshots_user_idx on trend.item_snapshots (user_id);

alter table trend.items enable row level security;
alter table trend.item_snapshots enable row level security;
create policy items_select_own on trend.items for select to authenticated
  using ((select auth.uid()) = user_id);
create policy item_snapshots_select_own on trend.item_snapshots for select to authenticated
  using ((select auth.uid()) = user_id);
grant select on trend.items, trend.item_snapshots to authenticated;
grant all on trend.items, trend.item_snapshots to service_role;
