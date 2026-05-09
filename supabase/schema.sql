-- 在 Supabase Dashboard → SQL Editor 中执行此文件

-- 1. 创建分享快照表
create table if not exists share_snapshots (
  id           text primary key,                   -- nanoid 短码，如 "V1StGXR8"
  design_url   text not null,                       -- Supabase Storage 公开 URL
  live_url     text not null,
  annotations  jsonb not null default '[]',         -- Annotation[] 序列化
  diffs        jsonb not null default '[]',         -- DiffRecord[] 序列化
  created_at   timestamptz not null default now(),
  expires_at   timestamptz                          -- null = 永不过期
);

-- 2. 自动清理过期快照（可选，需要 pg_cron 扩展）
-- select cron.schedule('clean-expired-shares', '0 3 * * *',
--   $$ delete from share_snapshots where expires_at < now() $$);

-- 3. Storage：在 Supabase Dashboard → Storage 中创建名为 "share-images" 的 bucket
--    并设置为 Public（允许匿名读取）
--
--    或用以下 SQL（需要 storage schema 权限）：
-- insert into storage.buckets (id, name, public)
-- values ('share-images', 'share-images', true)
-- on conflict do nothing;

-- 4. RLS 策略 — 允许所有人读，只允许 service_role 写
alter table share_snapshots enable row level security;

create policy "anyone can read snapshots"
  on share_snapshots for select
  using (true);

create policy "service role can insert snapshots"
  on share_snapshots for insert
  with check (true);   -- API Route 用 service_role key，绕过 RLS
