-- 무료 플랜 없이: 체험(trial) → 베이직/플러스, 체험 끝나고 결제 안 하면 expired
alter table trend.profiles drop constraint profiles_plan_check;
alter table trend.profiles alter column plan set default 'trial';
alter table trend.profiles add constraint profiles_plan_check
  check (plan in ('trial','basic','plus','expired'));
alter table trend.profiles add column trial_ends_at timestamptz;
