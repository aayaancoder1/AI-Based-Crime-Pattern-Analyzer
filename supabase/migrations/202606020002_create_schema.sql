-- CrimeLens core schema.
-- This migration creates tables, foreign keys, constraints, generated PostGIS
-- geometry columns, and helper trigger functions.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

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
    ),
    constraint datasets_record_counts_check check (
        total_records >= 0
        and clean_records >= 0
        and invalid_records >= 0
    )
);

create table if not exists public.crime_types (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    slug text not null unique,
    description text,
    created_at timestamptz not null default now(),
    constraint crime_types_slug_check check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
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
    constraint incidents_longitude_check check (longitude >= -180 and longitude <= 180),
    constraint incidents_source_row_number_check check (
        source_row_number is null or source_row_number > 0
    )
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
    ),
    constraint analysis_jobs_finished_after_started_check check (
        finished_at is null
        or started_at is null
        or finished_at >= started_at
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
    constraint clusters_center_latitude_check check (
        center_latitude >= -90 and center_latitude <= 90
    ),
    constraint clusters_center_longitude_check check (
        center_longitude >= -180 and center_longitude <= 180
    ),
    constraint clusters_incident_count_check check (incident_count >= 0),
    constraint clusters_density_score_check check (density_score >= 0),
    constraint clusters_risk_level_check check (
        risk_level is null or risk_level in ('low', 'medium', 'high')
    ),
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
    constraint risk_scores_score_check check (risk_score >= 0 and risk_score <= 100),
    constraint risk_scores_components_check check (
        incident_count_component >= 0
        and density_component >= 0
        and recency_component >= 0
        and crime_mix_component >= 0
    )
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

drop trigger if exists set_datasets_updated_at on public.datasets;
create trigger set_datasets_updated_at
before update on public.datasets
for each row
execute function public.set_updated_at();

drop trigger if exists set_analysis_jobs_updated_at on public.analysis_jobs;
create trigger set_analysis_jobs_updated_at
before update on public.analysis_jobs
for each row
execute function public.set_updated_at();
