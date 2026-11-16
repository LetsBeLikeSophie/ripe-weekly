-- 리포트 아이콘: 미리 만든 아이콘 세트의 키 (AI가 고르고, 사용자가 바꿀 수 있음)
alter table trend.topics
  add column icon text,                                   -- 예: 'cake', 'music', 'house', 'flask', 'chip'
  add column icon_source text not null default 'ai'
    check (icon_source in ('ai','user','fallback'));     -- fallback = 첫 글자
comment on column trend.topics.icon is '아이콘 세트 키. null이면 이름 첫 글자로 표시';
