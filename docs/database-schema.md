# CrimeLens Database Schema

This document describes the Supabase database implemented by the V1 migrations.

## Migration Files

- `supabase/migrations/202606020001_enable_extensions.sql`
- `supabase/migrations/202606020002_create_schema.sql`
- `supabase/migrations/202606020003_create_indexes.sql`
- `supabase/migrations/202606020004_enable_rls_policies.sql`
- `supabase/seed.sql`

## Extensions

### PostGIS

PostGIS is enabled for geospatial storage and lookup. Incidents and clusters store generated geometry points using SRID 4326.

### pgcrypto

`pgcrypto` is enabled for `gen_random_uuid()`.

## Tables

### datasets

Stores uploaded dataset metadata.

Important columns:

- `id`: Dataset primary key.
- `owner_id`: Auth user that owns the dataset.
- `filename`: Original uploaded file name.
- `storage_path`: Supabase Storage path for the uploaded file.
- `status`: Dataset lifecycle state.
- `total_records`: Raw uploaded row count.
- `clean_records`: Records accepted after validation/cleaning.
- `invalid_records`: Records rejected during validation/cleaning.
- `validation_summary`: JSON validation details.
- `created_at`, `updated_at`: Timestamps.

Allowed statuses:

- `uploaded`
- `validating`
- `validation_failed`
- `cleaning`
- `importing`
- `ready`
- `analyzing`
- `analyzed`
- `failed`

### crime_types

Stores normalized crime categories used for filtering, reporting, and risk scoring.

Important columns:

- `id`: Crime type primary key.
- `name`: Display name.
- `slug`: Stable unique key.
- `description`: Human-readable category description.
- `created_at`: Timestamp.

Seeded values include theft, burglary, assault, robbery, vandalism, vehicle theft, drug offense, fraud, public disorder, and other.

### incidents

Stores cleaned crime records for a dataset.

Important columns:

- `id`: Incident primary key.
- `dataset_id`: Parent dataset.
- `crime_type_id`: Normalized crime type.
- `raw_crime_type`: Original source crime label.
- `latitude`, `longitude`: Numeric coordinates.
- `geom`: Generated PostGIS `geometry(Point, 4326)`.
- `incident_date`: Incident timestamp.
- `district`: Optional district or area label.
- `description`: Optional incident text.
- `source_row_number`: Original CSV row number.
- `created_at`: Timestamp.

Constraints enforce valid latitude and longitude ranges.

### analysis_jobs

Stores the lifecycle of import and analysis work.

Important columns:

- `id`: Job primary key.
- `dataset_id`: Parent dataset.
- `job_type`: Type of work requested.
- `status`: Current job status.
- `parameters`: JSON job parameters.
- `result_summary`: JSON output summary.
- `started_at`, `finished_at`: Runtime timestamps.
- `error_message`: Failure details.
- `created_at`, `updated_at`: Timestamps.

Allowed job types:

- `import`
- `hotspot_detection`
- `risk_scoring`
- `report_generation`
- `full_analysis`

Allowed statuses:

- `queued`
- `running`
- `succeeded`
- `failed`

### clusters

Stores DBSCAN hotspot outputs.

Important columns:

- `id`: Cluster primary key.
- `dataset_id`: Parent dataset.
- `analysis_job_id`: Job that produced the cluster.
- `cluster_label`: DBSCAN cluster label.
- `center_latitude`, `center_longitude`: Cluster center coordinates.
- `center_geom`: Generated PostGIS `geometry(Point, 4326)`.
- `incident_count`: Number of incidents in the cluster.
- `density_score`: Density metric produced by analysis.
- `dominant_crime_type_id`: Most common normalized crime type in the cluster.
- `risk_level`: Optional low, medium, or high risk label.
- `created_at`: Timestamp.

### risk_scores

Stores explainable historical risk scoring results. These are deterministic scores, not supervised ML predictions.

Important columns:

- `id`: Risk score primary key.
- `dataset_id`: Parent dataset.
- `analysis_job_id`: Job that produced the score.
- `cluster_id`: Optional cluster being scored.
- `risk_level`: Low, medium, or high.
- `risk_score`: Numeric score from 0 to 100.
- `incident_count_component`: Contribution from incident volume.
- `density_component`: Contribution from spatial density.
- `recency_component`: Contribution from recent historical activity.
- `crime_mix_component`: Contribution from the crime type mix.
- `explanation`: Human-readable scoring explanation.
- `created_at`: Timestamp.

### reports

Stores generated report metadata and structured report content.

Important columns:

- `id`: Report primary key.
- `owner_id`: Auth user that owns the report.
- `dataset_id`: Parent dataset.
- `analysis_job_id`: Job that produced the report.
- `title`: Report title.
- `report_type`: Report category.
- `summary`: Short report summary.
- `structured_content`: JSON report sections and metrics.
- `storage_path`: Optional Supabase Storage path for rendered exports.
- `generated_at`: Timestamp.

Allowed report types:

- `dataset_summary`
- `hotspot_report`
- `risk_score_report`
- `full_report`

## Indexes

Ownership and status:

- `idx_datasets_owner_id`
- `idx_datasets_status`
- `idx_reports_owner_id`

Crime type lookup:

- `idx_crime_types_slug`

Incident filtering:

- `idx_incidents_dataset_id`
- `idx_incidents_dataset_date`
- `idx_incidents_dataset_crime_type`
- `idx_incidents_dataset_district`
- `idx_incidents_geom`

Analysis and outputs:

- `idx_analysis_jobs_dataset_status`
- `idx_analysis_jobs_type`
- `idx_clusters_dataset_job`
- `idx_clusters_center_geom`
- `idx_clusters_dominant_crime_type`
- `idx_risk_scores_dataset`
- `idx_risk_scores_cluster`
- `idx_risk_scores_level`
- `idx_reports_dataset_id`

## RLS Policy Model

CrimeLens V1 is single-user/multi-account.

RLS rules:

- Users can select, insert, update, and delete only their own `datasets`.
- Authenticated users can read shared normalized `crime_types`.
- Users can read `incidents`, `analysis_jobs`, `clusters`, and `risk_scores` only when the parent dataset belongs to them.
- Users can select, insert, update, and delete only their own `reports`.

The backend may use Supabase service-role credentials for controlled server-side writes, but service-role credentials must never be exposed to the frontend.
