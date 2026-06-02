-- CrimeLens row level security policies.
-- The app is single-user/multi-account: each authenticated account owns
-- its datasets and reports. Dataset-scoped tables are readable only through
-- datasets owned by the current user.

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
