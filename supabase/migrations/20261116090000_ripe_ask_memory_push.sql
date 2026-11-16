-- 물어보기 · 기억하는 내 상황 · 푸시 토큰 · 말로 고치기 미리보기
create table ripe.ask_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_id uuid not null references ripe.reports(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  cost_usd numeric(10,5),
  created_at timestamptz not null default now()
);
create index ask_messages_report_idx on ripe.ask_messages (report_id, created_at);
create index ask_messages_user_month_idx on ripe.ask_messages (user_id, created_at) where role = 'user';

create table ripe.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid references ripe.topics(id) on delete set null,
  text text not null,
  source text,
  created_at timestamptz not null default now()
);
create index memories_user_idx on ripe.memories (user_id, created_at desc);
create index memories_topic_idx on ripe.memories (topic_id);

create table ripe.push_tokens (
  token text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('ios','android','web')),
  created_at timestamptz not null default now()
);
create index push_tokens_user_idx on ripe.push_tokens (user_id);

-- 서버만 쓰는 표 (사용자 권한 없음)
create table ripe.fix_previews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null references ripe.topics(id) on delete cascade,
  instruction text not null,
  new_prompt text not null,
  summary text not null,
  changes jsonb not null default '[]',
  applied_at timestamptz,
  created_at timestamptz not null default now()
);
create index fix_previews_topic_idx on ripe.fix_previews (topic_id);
create index fix_previews_user_idx on ripe.fix_previews (user_id);

alter table ripe.ask_messages enable row level security;
alter table ripe.memories enable row level security;
alter table ripe.push_tokens enable row level security;
alter table ripe.fix_previews enable row level security;

create policy ask_select_own on ripe.ask_messages for select to authenticated using ((select auth.uid()) = user_id);
create policy memories_select_own on ripe.memories for select to authenticated using ((select auth.uid()) = user_id);
create policy memories_delete_own on ripe.memories for delete to authenticated using ((select auth.uid()) = user_id);
create policy push_select_own on ripe.push_tokens for select to authenticated using ((select auth.uid()) = user_id);
create policy push_insert_own on ripe.push_tokens for insert to authenticated with check ((select auth.uid()) = user_id);
create policy push_update_own on ripe.push_tokens for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy push_delete_own on ripe.push_tokens for delete to authenticated using ((select auth.uid()) = user_id);

grant select on ripe.ask_messages to authenticated;
grant select, delete on ripe.memories to authenticated;
grant select, insert, update, delete on ripe.push_tokens to authenticated;
grant all on ripe.ask_messages, ripe.memories, ripe.push_tokens, ripe.fix_previews to service_role;
