-- Run this in Supabase SQL Editor to create the tables

create table eval_runs (
  id uuid primary key default gen_random_uuid(),
  trigger text not null default 'manual', -- 'manual' | 'auto'
  status text not null default 'running', -- 'running' | 'completed' | 'error'
  message text, -- user's initial message
  summary text, -- agent's final summary
  issues_found int default 0,
  rules_added int default 0,
  pr_url text,
  created_at timestamptz default now(),
  completed_at timestamptz
);

create table eval_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references eval_runs(id) on delete cascade,
  tool_name text not null,
  tool_args jsonb default '{}',
  tool_result jsonb default '{}',
  duration_ms int default 0,
  created_at timestamptz default now()
);

-- Index for fast dashboard queries
create index idx_eval_runs_created_at on eval_runs(created_at desc);
create index idx_eval_steps_run_id on eval_steps(run_id);

-- Enable RLS but allow all for hackathon (no auth needed for reads)
alter table eval_runs enable row level security;
alter table eval_steps enable row level security;

create policy "Allow all on eval_runs" on eval_runs for all using (true) with check (true);
create policy "Allow all on eval_steps" on eval_steps for all using (true) with check (true);
