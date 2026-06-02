-- CrimeLens indexes for ownership, dataset-scoped queries, and PostGIS lookup.

create index if not exists idx_datasets_owner_id
on public.datasets(owner_id);

create index if not exists idx_datasets_status
on public.datasets(status);

create index if not exists idx_crime_types_slug
on public.crime_types(slug);

create index if not exists idx_incidents_dataset_id
on public.incidents(dataset_id);

create index if not exists idx_incidents_dataset_date
on public.incidents(dataset_id, incident_date);

create index if not exists idx_incidents_dataset_crime_type
on public.incidents(dataset_id, crime_type_id);

create index if not exists idx_incidents_dataset_district
on public.incidents(dataset_id, district);

create index if not exists idx_incidents_geom
on public.incidents using gist(geom);

create index if not exists idx_analysis_jobs_dataset_status
on public.analysis_jobs(dataset_id, status, created_at);

create index if not exists idx_analysis_jobs_type
on public.analysis_jobs(job_type);

create index if not exists idx_clusters_dataset_job
on public.clusters(dataset_id, analysis_job_id);

create index if not exists idx_clusters_center_geom
on public.clusters using gist(center_geom);

create index if not exists idx_clusters_dominant_crime_type
on public.clusters(dominant_crime_type_id);

create index if not exists idx_risk_scores_dataset
on public.risk_scores(dataset_id);

create index if not exists idx_risk_scores_cluster
on public.risk_scores(cluster_id);

create index if not exists idx_risk_scores_level
on public.risk_scores(dataset_id, risk_level);

create index if not exists idx_reports_owner_id
on public.reports(owner_id);

create index if not exists idx_reports_dataset_id
on public.reports(dataset_id);
