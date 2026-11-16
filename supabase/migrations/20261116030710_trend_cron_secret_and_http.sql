create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;
-- 예약 실행용 내부 비밀값: 랜덤 생성, Vault에 암호화 보관 (사람이 볼 일 없음)
select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'ripe_cron_secret', 'Ripe Weekly 예약 실행 확인용');
