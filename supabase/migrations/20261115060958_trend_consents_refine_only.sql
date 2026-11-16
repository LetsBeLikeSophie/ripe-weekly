-- 선택 동의는 "리포트를 더 정확하게" 목적만. 광고·마케팅 동의는 받지 않음.
alter table trend.consents drop constraint consents_kind_check;
alter table trend.consents add constraint consents_kind_check check (kind in (
  'terms','privacy','overseas_transfer',      -- 필수
  'personalize_from_activity',                -- 선택: 읽은 기록·피드백으로 내 리포트 맞추기
  'remember_context',                         -- 선택: 내 상황(하는 일·지역·관심사) 기억해서 다른 글감에도 쓰기
  'aggregate_quality',                        -- 선택: 이름 없이 묶은 통계로 리포트 형식 개선
  'kakao_message'                             -- 카카오톡으로 받기
));
comment on table trend.consents is '광고·마케팅 목적 동의는 받지 않는다. 선택 동의 데이터는 리포트 품질 개선에만 쓴다.';

-- 글감(주제)별 켜고 끄기는 topics.enabled 사용, 받는 곳은 계정 단위
alter table trend.profiles
  add column channels text[] not null default '{app}'  -- app, kakao, email
    check (channels <@ array['app','kakao','email']::text[]);
grant update (channels) on trend.profiles to authenticated;
