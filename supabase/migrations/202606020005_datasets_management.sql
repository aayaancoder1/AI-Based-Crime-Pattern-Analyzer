-- Dataset management metadata for the initial API.
-- This migration is additive so it can run after the earlier broader schema.

create table if not exists public.datasets (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    source text,
    status text not null default 'created',
    record_count integer not null default 0,
    uploaded_at timestamptz not null default now(),
    created_at timestamptz not null default now()
);

alter table public.datasets
add column if not exists name text;

alter table public.datasets
add column if not exists source text;

alter table public.datasets
add column if not exists record_count integer not null default 0;

alter table public.datasets
add column if not exists uploaded_at timestamptz not null default now();

do $$
begin
    if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'datasets'
          and column_name = 'filename'
    ) then
        execute 'update public.datasets set name = coalesce(name, filename) where name is null';
    end if;
end $$;

do $$
begin
    if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'datasets'
          and column_name = 'total_records'
    ) then
        execute 'update public.datasets set record_count = total_records where record_count = 0';
    end if;
end $$;

update public.datasets
set name = 'Untitled Dataset'
where name is null;

alter table public.datasets
alter column name set not null;

alter table public.datasets
drop constraint if exists datasets_status_check;

alter table public.datasets
add constraint datasets_status_check check (
    status in (
        'created',
        'uploaded',
        'validating',
        'validation_failed',
        'cleaning',
        'importing',
        'ready',
        'analyzing',
        'analyzed',
        'failed'
    )
);

alter table public.datasets
drop constraint if exists datasets_record_count_check;

alter table public.datasets
add constraint datasets_record_count_check check (record_count >= 0);

create index if not exists idx_datasets_uploaded_at
on public.datasets(uploaded_at);
