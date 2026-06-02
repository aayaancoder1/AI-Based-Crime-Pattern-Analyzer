-- CrimeLens schema v1
-- Supabase PostgreSQL + PostGIS

create extension if not exists postgis;
create extension if not exists pgcrypto;

create table if not exists public.datasets (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references auth.users(id) on delete cascade,
    filename text not null,
    storage_path text,
    status text not null default 'uploaded',
    total_records integer not null default 0,
    clean_records integer not null default 0,
    invalid_records integer not null default 0,
    validation_summary jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint datasets_status_check check (
        status in (
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
    )
);

create table if not exists public.crime_types (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    slug text not null unique,
    description text,
    created_at timestamptz not null default now()
);

create table if not exists public.incidents (
    id uuid primary key default gen_random_uuid(),
    dataset_id uuid not null references public.datasets(id) on delete cascade,
    crime_type_id uuid references public.crime_types(id) on delete set null,
    raw_crime_type text,
    latitude double precision not null,
    longitude double precision not null,
    geom geometry(Point, 4326) generated always as (
        st_setsrid(st_makepoint(longitude, latitude), 4326)
    ) stored,
    incident_date timestamptz not null,
    district text,
    description text,
    source_row_number integer,
    created_at timestamptz not null default now(),
    constraint incidents_latitude_check check (latitude >= -90 and latitude <= 90),
    constraint incidents_longitude_check check (longitude >= -180 and longitude <= 180)
);

create table if not exists public.analysis_jobs (
    id uuid primary key default gen_random_uuid(),
    dataset_id uuid not null references public.datasets(id) on delete cascade,
    job_type text not null,
    status text not null default 'queued',
    parameters jsonb not null default '{}'::jsonb,
    result_summary jsonb not null default '{}'::jsonb,
    started_at timestamptz,
    finished_at timestamptz,
    error_message text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint analysis_jobs_type_check check (
        job_type in (
            'import',
            'hotspot_detection',
            'risk_scoring',
            'report_generation',
            'full_analysis'
        )
    ),
    constraint analysis_jobs_status_check check (
        status in ('queued', 'running', 'succeeded', 'failed')
    )
);

create table if not exists public.clusters (
    id uuid primary key default gen_random_uuid(),
    dataset_id uuid not null references public.datasets(id) on delete cascade,
    analysis_job_id uuid references public.analysis_jobs(id) on delete set null,
    cluster_label integer not null,
    center_latitude double precision not null,
    center_longitude double precision not null,
    center_geom geometry(Point, 4326) generated always as (
        st_setsrid(st_makepoint(center_longitude, center_latitude), 4326)
    ) stored,
    incident_count integer not null default 0,
    density_score numeric(10, 4) not null default 0,
    dominant_crime_type_id uuid references public.crime_types(id) on delete set null,
    risk_level text,
    created_at timestamptz not null default now(),
    constraint clusters_center_latitude_check check (center_latitude >= -90 and center_latitude <= 90),
    constraint clusters_center_longitude_check check (center_longitude >= -180 and center_longitude <= 180),
    constraint clusters_risk_level_check check (risk_level is null or risk_level in ('low', 'medium', 'high')),
    unique (dataset_id, analysis_job_id, cluster_label)
);

create table if not exists public.risk_scores (
    id uuid primary key default gen_random_uuid(),
    dataset_id uuid not null references public.datasets(id) on delete cascade,
    analysis_job_id uuid references public.analysis_jobs(id) on delete set null,
    cluster_id uuid references public.clusters(id) on delete cascade,
    risk_level text not null,
    risk_score numeric(10, 4) not null,
    incident_count_component numeric(10, 4) not null default 0,
    density_component numeric(10, 4) not null default 0,
    recency_component numeric(10, 4) not null default 0,
    crime_mix_component numeric(10, 4) not null default 0,
    explanation text,
    created_at timestamptz not null default now(),
    constraint risk_scores_level_check check (risk_level in ('low', 'medium', 'high')),
    constraint risk_scores_score_check check (risk_score >= 0 and risk_score <= 100)
);

create table if not exists public.reports (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references auth.users(id) on delete cascade,
    dataset_id uuid not null references public.datasets(id) on delete cascade,
    analysis_job_id uuid references public.analysis_jobs(id) on delete set null,
    title text not null,
    report_type text not null,
    summary text,
    structured_content jsonb not null default '{}'::jsonb,
    storage_path text,
    generated_at timestamptz not null default now(),
    constraint reports_type_check check (
        report_type in (
            'dataset_summary',
            'hotspot_report',
            'risk_score_report',
            'full_report'
        )
    )
);

create index if not exists idx_datasets_owner_id on public.datasets(owner_id);
create index if not exists idx_datasets_status on public.datasets(status);

create index if not exists idx_crime_types_slug on public.crime_types(slug);

create index if not exists idx_incidents_dataset_id on public.incidents(dataset_id);
create index if not exists idx_incidents_dataset_date on public.incidents(dataset_id, incident_date);
create index if not exists idx_incidents_dataset_crime_type on public.incidents(dataset_id, crime_type_id);
create index if not exists idx_incidents_geom on public.incidents using gist(geom);

create index if not exists idx_analysis_jobs_dataset_status on public.analysis_jobs(dataset_id, status, created_at);
create index if not exists idx_analysis_jobs_type on public.analysis_jobs(job_type);

create index if not exists idx_clusters_dataset_job on public.clusters(dataset_id, analysis_job_id);
create index if not exists idx_clusters_center_geom on public.clusters using gist(center_geom);

create index if not exists idx_risk_scores_dataset on public.risk_scores(dataset_id);
create index if not exists idx_risk_scores_cluster on public.risk_scores(cluster_id);

create index if not exists idx_reports_owner_id on public.reports(owner_id);
create index if not exists idx_reports_dataset_id on public.reports(dataset_id);

alter table public.datasets enable row level security;
alter table public.crime_types enable row level security;
alter table public.incidents enable row level security;
alter table public.analysis_jobs enable row level security;
alter table public.clusters enable row level security;
alter table public.risk_scores enable row level security;
alter table public.reports enable row level security;

create policy "Users can read own datasets"
on public.datasets for select
using (owner_id = auth.uid());

create policy "Users can insert own datasets"
on public.datasets for insert
with check (owner_id = auth.uid());

create policy "Users can update own datasets"
on public.datasets for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "Users can delete own datasets"
on public.datasets for delete
using (owner_id = auth.uid());

create policy "Authenticated users can read crime types"
on public.crime_types for select
to authenticated
using (true);

create policy "Users can read incidents from own datasets"
on public.incidents for select
using (
    exists (
        select 1
        from public.datasets d
        where d.id = incidents.dataset_id
          and d.owner_id = auth.uid()
    )
);

create policy "Users can read analysis jobs from own datasets"
on public.analysis_jobs for select
using (
    exists (
        select 1
        from public.datasets d
        where d.id = analysis_jobs.dataset_id
          and d.owner_id = auth.uid()
    )
);

create policy "Users can read clusters from own datasets"
on public.clusters for select
using (
    exists (
        select 1
        from public.datasets d
        where d.id = clusters.dataset_id
          and d.owner_id = auth.uid()
    )
);

create policy "Users can read risk scores from own datasets"
on public.risk_scores for select
using (
    exists (
        select 1
        from public.datasets d
        where d.id = risk_scores.dataset_id
          and d.owner_id = auth.uid()
    )
);

create policy "Users can read own reports"
on public.reports for select
using (owner_id = auth.uid());

create policy "Users can insert own reports"
on public.reports for insert
with check (owner_id = auth.uid());

create policy "Users can update own reports"
on public.reports for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "Users can delete own reports"
on public.reports for delete
using (owner_id = auth.uid());
