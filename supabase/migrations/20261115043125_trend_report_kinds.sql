-- 분야마다 리포트 형식·출처·깊이가 다르므로 주제에 저장
alter table trend.topics
  add column kind text not null default 'trend'
    check (kind in ('trend','news','research','release','policy','market')),
  add column depth text not null default 'easy'
    check (depth in ('easy','practitioner','expert')),
  add column source_profile text[] not null default '{}';  -- 예: {'news','sns'} / {'arxiv','pubmed','journal'} / {'release_notes','github'}

comment on column trend.topics.kind is 'trend=뜨는 것, news=새 소식, research=연구·논문, release=제품·모델 출시, policy=정책·규제, market=시장·가격';
comment on column trend.topics.depth is 'easy=입문(용어 풀이), practitioner=실무자, expert=전공자';
