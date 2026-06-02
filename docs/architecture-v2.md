# CrimeLens - System Architecture V2

## Scope Decisions

CrimeLens is a single-user/multi-account research application. Each account owns its own datasets and reports. There are no organizations, teams, shared workspaces, enterprise audit logs, or caching requirements in this version.

Architecture decisions included in V2:

- Use Supabase PostgreSQL with PostGIS.
- Add `analysis_jobs` as the lifecycle table for long-running analysis work.
- Add `crime_types` to normalize crime categories.
- Use `owner_id` on `datasets` and `reports`.
- Replace Random Forest prediction with explainable risk scoring.
- Keep the project focused on historical datasets, research use, and portfolio-grade functionality.

---

## High-Level Architecture

User
-> React Frontend
-> FastAPI Backend
-> Supabase Auth
-> Supabase PostgreSQL + PostGIS
-> Supabase Storage
-> Python Analysis Pipeline

The FastAPI backend owns API behavior, validation, dataset processing, analysis orchestration, and report generation. Supabase owns authentication, relational data, geospatial data, and uploaded file storage.

---

## Frontend Layer

Technology:

- React
- TypeScript
- TailwindCSS
- Leaflet
- Recharts

Responsibilities:

- User sign up, login, and logout through Supabase Auth.
- Dataset upload UI.
- Dataset status and analysis job status views.
- Dashboard visualization.
- Leaflet map rendering.
- Heatmap and cluster display.
- Crime type, date range, and district filtering.
- Report viewing and export download links.

The frontend should use scoped API requests. It should not directly query another user's data and should not rely on client-side filtering of entire datasets for core workflows.

---

## Backend Layer

Technology:

- FastAPI
- Python
- Pandas
- NumPy
- Scikit-Learn for DBSCAN and supporting analytics utilities

Responsibilities:

- Verify Supabase JWTs for protected API requests.
- Accept and validate CSV uploads.
- Store raw files in Supabase Storage.
- Clean and import incidents.
- Normalize crime types.
- Create and update analysis jobs.
- Run geospatial hotspot detection.
- Generate explainable risk scores.
- Generate reports.
- Communicate with Supabase PostgreSQL and Storage.

The backend may run analysis synchronously for small demo datasets, but the architecture treats analysis as job-based work through the `analysis_jobs` table. API responses should expose job status rather than pretending every operation is instant.

---

## Database Layer

Technology:

- Supabase PostgreSQL
- PostGIS extension
- Supabase Auth
- Supabase Storage

Core tables:

- `datasets`
- `crime_types`
- `incidents`
- `analysis_jobs`
- `clusters`
- `risk_scores`
- `reports`

### datasets

Stores uploaded dataset metadata.

Key fields:

- `id`
- `owner_id`
- `filename`
- `storage_path`
- `status`
- `total_records`
- `clean_records`
- `invalid_records`
- `created_at`
- `updated_at`

### crime_types

Stores normalized crime categories.

Key fields:

- `id`
- `name`
- `slug`
- `description`
- `created_at`

### incidents

Stores cleaned crime incidents.

Key fields:

- `id`
- `dataset_id`
- `crime_type_id`
- `raw_crime_type`
- `latitude`
- `longitude`
- `geom`
- `incident_date`
- `district`
- `description`
- `source_row_number`
- `created_at`

`geom` is a PostGIS point using SRID 4326 and should be indexed for map viewport queries and spatial analysis.

### analysis_jobs

Stores analysis lifecycle state.

Key fields:

- `id`
- `dataset_id`
- `job_type`
- `status`
- `parameters`
- `started_at`
- `finished_at`
- `error_message`
- `created_at`
- `updated_at`

Supported job types:

- `import`
- `hotspot_detection`
- `risk_scoring`
- `report_generation`
- `full_analysis`

Supported statuses:

- `queued`
- `running`
- `succeeded`
- `failed`

### clusters

Stores DBSCAN hotspot outputs.

Key fields:

- `id`
- `dataset_id`
- `analysis_job_id`
- `cluster_label`
- `center_latitude`
- `center_longitude`
- `center_geom`
- `incident_count`
- `density_score`
- `dominant_crime_type_id`
- `risk_level`
- `created_at`

### risk_scores

Stores explainable risk scoring outputs.

Risk scores are not supervised ML predictions. They are deterministic, explainable scores derived from historical dataset statistics.

Key fields:

- `id`
- `dataset_id`
- `analysis_job_id`
- `cluster_id`
- `risk_level`
- `risk_score`
- `incident_count_component`
- `density_component`
- `recency_component`
- `crime_mix_component`
- `explanation`
- `created_at`

Risk levels:

- `low`
- `medium`
- `high`

### reports

Stores generated report metadata and structured content.

Key fields:

- `id`
- `owner_id`
- `dataset_id`
- `analysis_job_id`
- `title`
- `report_type`
- `summary`
- `structured_content`
- `storage_path`
- `generated_at`

---

## Geospatial Design

PostGIS is required for V2.

Spatial behavior:

- Incidents store both numeric latitude/longitude and a PostGIS `geom` point.
- Map endpoints should support bounding box filters.
- Clusters store their center as both latitude/longitude and a PostGIS point.
- Spatial indexes should be created on incident and cluster geometry.

DBSCAN must not use raw latitude/longitude as plain Cartesian values. The analysis pipeline should use haversine distance or a suitable projected coordinate representation.

---

## Analysis Pipeline

Dataset Upload
-> File Storage
-> Validation
-> Cleaning
-> Crime Type Normalization
-> Incident Import
-> Analysis Job Creation
-> DBSCAN Hotspot Detection
-> Explainable Risk Scoring
-> Report Generation
-> Visualization

### Dataset Validation

Required incident fields:

- crime type
- latitude
- longitude
- incident date

Optional fields:

- district
- description
- source row identifier

Validation should track:

- total records
- clean records
- invalid records
- invalid coordinates
- missing crime type
- invalid dates

### Hotspot Detection

Algorithm:

- DBSCAN

Inputs:

- incident geospatial coordinates

Outputs:

- hotspot cluster label
- center point
- incident count
- density score
- dominant crime type

Reason:

- Handles irregular cluster shapes.
- Identifies outliers.
- Works well as a baseline for spatial hotspot discovery when configured with geospatial distance.

### Explainable Risk Scoring

Random Forest classification is removed from V2.

Risk scoring is deterministic and explainable. It should use transparent components such as:

- incident count
- density
- recent activity
- concentration of severe or frequent crime types

Outputs:

- numeric risk score
- low/medium/high risk level
- component scores
- human-readable explanation

Risk scoring should be presented as historical risk assessment, not future crime prediction.

---

## API Structure

Recommended routes:

- `GET /datasets`
- `POST /datasets/upload`
- `GET /datasets/{dataset_id}`
- `GET /datasets/{dataset_id}/incidents`
- `GET /datasets/{dataset_id}/stats`
- `GET /crime-types`
- `POST /datasets/{dataset_id}/analysis-jobs`
- `GET /analysis-jobs/{job_id}`
- `GET /datasets/{dataset_id}/clusters`
- `GET /datasets/{dataset_id}/risk-scores`
- `GET /datasets/{dataset_id}/reports`
- `GET /reports/{report_id}`

Map incident endpoints should support:

- bounding box
- crime type
- date range
- district
- pagination or result limits

---

## Security

Security scope is intentionally lightweight but required.

Requirements:

- Supabase Auth for accounts.
- JWT verification on backend endpoints.
- RLS enabled on application tables.
- `owner_id` on `datasets` and `reports`.
- Dataset-scoped access checks for incidents, analysis jobs, clusters, and risk scores.
- File upload validation.
- CSV export sanitization for formula-like values.
- Service role keys must never be exposed to the frontend.

No organizations, teams, audit logs, or enterprise governance features are included in V2.

---

## Deployment Architecture

Frontend:

- Vercel

Backend:

- FastAPI deployed to Hugging Face Spaces for the portfolio/demo version.

Database and storage:

- Supabase PostgreSQL with PostGIS
- Supabase Storage

---

## Development Roadmap

Phase 1:

- Project structure
- Supabase setup
- PostGIS schema
- Authentication

Phase 2:

- Dataset upload
- Validation
- Cleaning
- Incident import
- Crime type normalization

Phase 3:

- Dashboard
- Charts
- Leaflet map
- Filters

Phase 4:

- Analysis jobs
- DBSCAN hotspot detection
- Cluster visualization

Phase 5:

- Explainable risk scoring
- Risk explanations
- Reports and exports

Phase 6:

- Deployment
- End-to-end testing
