-- 글로벌: 주제별 조사 국가 + 받는 언어
alter table trend.topics
  add column regions text[] not null default '{KR}',      -- 조사할 나라 (ISO 3166-1 alpha-2)
  add column output_language text not null default 'ko'; -- 리포트 언어 (BCP-47)

-- 사용자 기본 설정 (거주 국가는 법 적용·LLM 지원 국가 판단용)
create table trend.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  country text,                        -- 거주 국가 (ISO alpha-2)
  language text not null default 'ko',
  timezone text not null default 'Asia/Seoul',
  plan text not null default 'free' check (plan in ('free','basic','plus')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_set_updated_at before update on trend.profiles
  for each row execute function trend.set_updated_at();

-- 서비스 가능 국가 (LLM 지원 + 법 검토 완료된 곳만 열기)
create table trend.supported_countries (
  country text primary key,
  llm_available boolean not null default false,
  legal_ready boolean not null default false,
  note text,
  updated_at timestamptz not null default now()
);
insert into trend.supported_countries (country, llm_available, legal_ready, note)
values ('KR', true, false, '1차 출시. 처리방침·약관 검토 필요');

alter table trend.profiles enable row level security;
alter table trend.supported_countries enable row level security;

create policy profiles_select_own on trend.profiles for select to authenticated
  using ((select auth.uid()) = user_id);
create policy profiles_insert_own on trend.profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy profiles_update_own on trend.profiles for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy supported_countries_read on trend.supported_countries for select to authenticated, anon
  using (true);

grant select, insert on trend.profiles to authenticated;
grant update (country, language, timezone) on trend.profiles to authenticated;
grant select on trend.supported_countries to authenticated, anon;
grant all on trend.profiles, trend.supported_countries to service_role;
