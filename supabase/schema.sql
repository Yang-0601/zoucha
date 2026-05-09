-- 在 Supabase Dashboard → SQL Editor 中执行此文件
-- =============================================================
-- Part 1：分享快照（share_snapshots）
-- =============================================================

create table if not exists share_snapshots (
  id           text primary key,
  design_url   text not null,
  live_url     text not null,
  annotations  jsonb not null default '[]',
  diffs        jsonb not null default '[]',
  created_at   timestamptz not null default now(),
  expires_at   timestamptz
);

alter table share_snapshots enable row level security;

create policy "anyone can read snapshots"
  on share_snapshots for select using (true);

create policy "service role can insert snapshots"
  on share_snapshots for insert with check (true);

-- =============================================================
-- Part 2：项目与版本（projects / versions / version_data）
-- =============================================================

-- 项目表（替换 IndexedDB projects）
create table if not exists projects (
  id          text primary key,
  name        text not null,
  version     text not null default '',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 版本表（替换 IndexedDB versions）
create table if not exists versions (
  id          text primary key,
  project_id  text not null references projects(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 每个版本的工作台数据（标注 + 差异 + 图片 URL）
create table if not exists version_data (
  version_id      text primary key references versions(id) on delete cascade,
  design_url      text,
  design_width    integer,
  design_height   integer,
  live_url        text,
  live_width      integer,
  live_height     integer,
  annotations     jsonb not null default '[]',
  diffs           jsonb not null default '[]',
  guidelines      jsonb not null default '{}',
  updated_at      timestamptz not null default now()
);

-- RLS：暂时全开放，后续接入 Auth 时再收紧
alter table projects    enable row level security;
alter table versions    enable row level security;
alter table version_data enable row level security;

create policy "public projects"     on projects     using (true) with check (true);
create policy "public versions"     on versions     using (true) with check (true);
create policy "public version_data" on version_data using (true) with check (true);

-- =============================================================
-- Part 3：Storage bucket（在 Dashboard → Storage 手动创建）
-- =============================================================
-- 创建名为 "version-images" 的 Public bucket，步骤：
--   Dashboard → Storage → New bucket
--   Name: version-images
--   Public bucket: ON
--
-- 如果有 storage schema 权限也可以直接执行：
-- insert into storage.buckets (id, name, public)
-- values ('version-images', 'version-images', true)
-- on conflict do nothing;
