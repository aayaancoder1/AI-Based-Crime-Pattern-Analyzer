# CrimeLens Architecture Review

## Executive Assessment

The current PRD and architecture are a solid starting sketch for a portfolio-grade analytics project, but they are not yet precise enough to guide implementation safely. The biggest gaps are ownership boundaries, dataset lifecycle, model validity, geospatial correctness, tenancy/security rules, and asynchronous processing. The current plan reads like a single-user demo; the product requirements imply a multi-user analytical platform.

My recommendation: tighten the requirements and data model before writing application code. In particular, define the uploaded dataset contract, enforce tenant isolation from day one, move analysis into background jobs, introduce geospatial database support, and treat the ML layer as an evaluated pipeline rather than a black-box feature.

## 1. Missing Requirements

### Dataset Contract Is Underspecified

The PRD says users can upload CSV files, but it does not define the required schema, accepted aliases, date formats, coordinate formats, timezone handling, maximum file size, duplicate handling, or validation error reporting.

Recommendations:

- Define a canonical incident schema: `crime_type`, `incident_timestamp`, `latitude`, `longitude`, and optional fields such as `district`, `description`, `source_id`, `severity`, and `address`.
- Support column mapping during upload instead of assuming every CSV matches the internal schema.
- Return row-level validation summaries: invalid coordinates, missing dates, unparseable timestamps, duplicate rows, and dropped records.
- Define upload limits explicitly: max file size, max rows per dataset, supported encodings, and timeout behavior.

### User And Tenant Model Is Missing

Authentication is mentioned, but the architecture does not define who owns datasets, reports, clusters, predictions, or incidents. Without this, RLS cannot be designed correctly.

Recommendations:

- Add `user_id` or `organization_id` ownership to every user-created entity.
- Decide whether this is single-user, per-user, or organization/team based.
- Define whether datasets can be shared, public, archived, or deleted.
- Define a deletion policy that cascades incidents, clusters, predictions, reports, and stored files.

### Analysis Workflow Is Too Vague

`POST /analyze` is not enough. Analysis will likely include validation, import, clustering, model training/inference, report generation, and status tracking. These are separate lifecycle stages.

Recommendations:

- Define explicit dataset states: `uploaded`, `validating`, `validation_failed`, `cleaning`, `importing`, `ready`, `analyzing`, `analyzed`, `failed`.
- Define analysis job states and failure handling separately from dataset state.
- Expose status endpoints so the frontend can poll or subscribe to long-running work.
- Store pipeline logs and summary metrics for debugging.

### Report Generation Requirements Are Thin

The PRD says reports can be exported as summaries, cluster reports, PDF, and CSV. It does not define report contents, access control, formatting, or reproducibility.

Recommendations:

- Define report types: dataset summary, hotspot report, trend report, prediction report.
- Store report parameters and source analysis version.
- Avoid storing only generated prose; store structured report sections as JSON plus rendered export artifacts.

### AI Insight Generator Needs Boundaries

The PRD promises natural language insights but does not define whether this is deterministic template generation, LLM-backed summarization, or both. It also does not define hallucination controls.

Recommendations:

- Start with deterministic insight templates derived from computed metrics.
- If an LLM is introduced later, pass only verified aggregate statistics, not raw unrestricted incident text.
- Store cited metrics with every generated insight so users can inspect the evidence.

## 2. Architectural Weaknesses

### Backend Is Doing Too Much Synchronously

The architecture puts upload processing, validation, ML orchestration, report generation, and Supabase communication inside one FastAPI service. This will work for a demo but will become brittle as datasets grow.

Recommendations:

- Split request/response APIs from background analysis jobs.
- Use a worker model for import, clustering, prediction, and export generation.
- Keep FastAPI responsible for authentication, metadata, job creation, and result retrieval.
- Consider Supabase Edge Functions, a separate Python worker, or Hugging Face scheduled/background jobs depending on deployment constraints.

### Hugging Face Spaces May Be A Weak Backend Host

Hugging Face Spaces is convenient for demos, but it is not ideal as a production API host for file uploads, long-running jobs, private networking, autoscaling, or strong availability guarantees.

Recommendations:

- Treat Hugging Face Spaces as a demo deployment unless production requirements are explicitly relaxed.
- If production-like behavior matters, consider Render, Fly.io, Railway, Cloud Run, or a containerized worker/API split.
- Keep deployment abstraction clean enough that the backend can move hosts without rewriting core logic.

### API Design Is Too Flat

The proposed endpoints do not express relationships or scopes. For example, `GET /incidents` without dataset scoping risks huge queries and cross-user leakage.

Recommendations:

- Use scoped routes such as `GET /datasets/{dataset_id}/incidents`, `POST /datasets/{dataset_id}/analysis-jobs`, and `GET /analysis-jobs/{job_id}`.
- Require pagination, filtering, sorting, and bounding-box queries for map data.
- Add lightweight aggregate endpoints instead of forcing the frontend to fetch raw incidents for charts.

### Frontend And Backend Auth Responsibilities Are Blurred

The frontend is listed as responsible for user authentication, while the backend communicates with Supabase. The backend must independently verify user identity and authorization.

Recommendations:

- Frontend should obtain Supabase session tokens.
- Backend should verify JWTs on every protected request.
- Backend should never trust a user-supplied `user_id`.
- Use service-role Supabase credentials only server-side and only after authorization checks.

## 3. Database Design Improvements

### Add Ownership And Relationships

Current tables lack foreign keys and tenant ownership.

Recommended fields:

- `datasets`: `id`, `owner_id`, `filename`, `storage_path`, `status`, `row_count_raw`, `row_count_clean`, `created_at`, `updated_at`, `deleted_at`.
- `incidents`: `id`, `dataset_id`, `owner_id`, `source_row_number`, `source_hash`, `crime_type_id`, `occurred_at`, `latitude`, `longitude`, `geom`, `district`, `description`, `created_at`.
- `analysis_jobs`: `id`, `dataset_id`, `owner_id`, `job_type`, `status`, `parameters`, `started_at`, `finished_at`, `error_message`.
- `clusters`: `id`, `dataset_id`, `analysis_job_id`, `cluster_label`, `center_geom`, `convex_hull`, `incident_count`, `density`, `risk_level`, `created_at`.
- `predictions`: `id`, `dataset_id`, `analysis_job_id`, `zone_id`, `predicted_risk`, `confidence_score`, `model_version`, `feature_snapshot`, `created_at`.
- `reports`: `id`, `dataset_id`, `analysis_job_id`, `owner_id`, `report_type`, `title`, `structured_content`, `storage_path`, `created_at`.

### Use PostGIS

Latitude and longitude columns alone are not enough for efficient spatial analysis.

Recommendations:

- Enable PostGIS in Supabase.
- Add `geom geography(Point, 4326)` or `geometry(Point, 4326)` to incidents.
- Add spatial indexes for incident lookup and cluster rendering.
- Use bounding-box and radius queries for map viewport loading.

### Normalize Crime Types

Storing raw `crime_type` strings directly on every incident makes filtering inconsistent.

Recommendations:

- Add a `crime_types` reference table.
- Store normalized labels plus raw source labels.
- Define an explicit mapping strategy for unknown or uncommon crime labels.

### Add Indexes Early

Required indexes should be part of the initial schema, not an afterthought.

Recommendations:

- Index `incidents(dataset_id, occurred_at)`.
- Index `incidents(dataset_id, crime_type_id)`.
- Add a spatial index on `incidents.geom`.
- Index `clusters(dataset_id, analysis_job_id)`.
- Index `analysis_jobs(dataset_id, status, created_at)`.

### Avoid Ambiguous Zone IDs

`predictions.zone_id` is undefined. Zones need a concrete representation.

Recommendations:

- Define zones as grid cells, administrative districts, clusters, or custom polygons.
- Add a `zones` table if predictions are not strictly tied to clusters.
- Store zone geometry and generation parameters.

## 4. ML Pipeline Improvements

### DBSCAN Needs Geospatial Treatment

Plain DBSCAN on raw latitude and longitude is mathematically weak because degrees are not uniform distances. The pipeline does not define projection, distance metric, or `eps` selection.

Recommendations:

- Use haversine distance with coordinates converted to radians, or project coordinates to a local metric CRS before clustering.
- Document and persist DBSCAN parameters: `eps`, `min_samples`, metric, and preprocessing choices.
- Tune clustering by geography and dataset scale rather than using one global default.
- Consider HDBSCAN for variable-density urban datasets.

### Random Forest Risk Prediction Lacks Labels

The PRD says Random Forest will classify risk as low, medium, or high, but it does not define ground-truth labels. Without labels, this is not a supervised learning problem.

Recommendations:

- Define how risk labels are created: historical incident density, future incident occurrence, expert labels, or quantile-based bins.
- If labels are heuristic, say so clearly and call the output a risk score, not a prediction.
- Split training and evaluation temporally to avoid leakage.
- Store model version, training data window, features, metrics, and calibration.

### Evaluation Metrics Are Missing

"Accurate clustering" and "stable API performance" are not sufficient. The ML features need measurable quality gates.

Recommendations:

- For clustering: track noise ratio, cluster count, average cluster size, silhouette-style diagnostics where appropriate, and analyst-facing sanity checks.
- For prediction: track precision/recall/F1 by class, ROC-AUC if binary/ordinal framing is used, confusion matrix, calibration, and temporal validation performance.
- Define acceptable baselines before claiming predictive value.

### Feature Engineering Needs Governance

The current feature list is reasonable but incomplete and risks leakage.

Recommendations:

- Separate historical features from target labels.
- Include temporal aggregation windows.
- Encode location using zones/grids rather than raw latitude/longitude when appropriate.
- Avoid using features that reveal the target period.
- Persist feature definitions so predictions are reproducible.

### Batch Pipeline Should Be Reproducible

The architecture stores outputs but not pipeline versions or parameters.

Recommendations:

- Store `analysis_job.parameters`.
- Store `model_version`.
- Store source dataset hash.
- Store cleaning statistics.
- Make report and prediction regeneration deterministic for the same inputs.

## 5. Security Concerns

### RLS Is Mentioned But Not Designed

RLS is not a checkbox. The schema needs ownership columns, policies, and backend behavior that align.

Recommendations:

- Add RLS policies for every table.
- Ensure users can only access rows where `owner_id = auth.uid()` or via organization membership.
- Test RLS with multiple users.
- Avoid exposing service-role credentials to the frontend under any condition.

### CSV Uploads Are A Major Attack Surface

CSV files can contain malicious formulas, huge payloads, malformed encodings, and content that breaks downstream exports.

Recommendations:

- Enforce file size and row count limits.
- Validate MIME type and file extension, but do not rely on them alone.
- Sanitize formulas when exporting CSV or reports.
- Strip or safely handle HTML/script-like content in descriptions.
- Stream uploads and parsing where possible.

### Report And Insight Text Can Leak Sensitive Data

Incident descriptions may contain personally identifiable information depending on source data.

Recommendations:

- Define a PII policy for uploaded datasets.
- Consider redacting names, phone numbers, exact addresses, and identifiers from descriptions.
- Do not pass raw descriptions to any external AI provider without explicit consent and documented handling.

### Backend Authorization Must Be Explicit

The API list does not mention authorization checks.

Recommendations:

- Every endpoint should require auth except health checks.
- Every dataset-scoped endpoint should verify ownership.
- Every storage object path should include owner/dataset scoping.
- Signed URLs should expire and be generated server-side.

### Public Deployment Needs CORS And Rate Limits

Vercel plus a public FastAPI backend means internet-exposed APIs.

Recommendations:

- Restrict CORS to known frontend origins.
- Add rate limiting for upload and analysis endpoints.
- Add request body limits.
- Add audit logs for uploads, analysis jobs, report exports, and failed authorization attempts.

## 6. Scalability Concerns

### Raw Incident Fetching Will Not Scale

Rendering all markers or fetching all incidents will fail with larger datasets.

Recommendations:

- Use server-side pagination and viewport-bounded queries.
- Return vector/grid/cluster summaries at low zoom levels.
- Fetch raw incidents only for selected regions or detail views.
- Precompute aggregates for dashboards.

### Long-Running Analysis Needs Jobs

Upload, cleaning, DBSCAN, prediction, and PDF generation can exceed normal HTTP request windows.

Recommendations:

- Introduce an `analysis_jobs` table immediately.
- Run heavy work asynchronously.
- Add retry policies and idempotency keys.
- Show job progress and terminal failure messages in the UI.

### Supabase Insert Strategy Needs Batching

Inserting thousands of incidents row by row will be slow and unreliable.

Recommendations:

- Use batched inserts or PostgreSQL copy-style import where available.
- Validate and stage data before final import.
- Consider a staging table for raw uploads and a cleaned incidents table for production queries.

### Map Heatmaps Need Pre-Aggregation

Client-side heatmap rendering over large datasets is expensive.

Recommendations:

- Precompute heatmap bins by dataset, zoom level, and time window.
- Use spatial grid aggregation such as H3, geohash, or PostGIS grid functions.
- Cache common date/type filter combinations if usage patterns justify it.

### Deployment Split Has Operational Risk

Vercel, Hugging Face Spaces, and Supabase together create cross-platform latency, secret management, and reliability concerns.

Recommendations:

- Document environment variables and ownership for each platform.
- Add health checks for backend and database connectivity.
- Add structured logging and error correlation IDs.
- Make local development mirror production enough to catch auth and CORS issues early.

## Highest-Priority Changes Before Implementation

1. Define the dataset schema, upload constraints, validation behavior, and lifecycle states.
2. Add ownership, foreign keys, RLS assumptions, and cascade behavior to the database design.
3. Introduce `analysis_jobs` as a first-class concept before building `POST /analyze`.
4. Enable PostGIS and design spatial queries around viewport and aggregation use cases.
5. Reframe the Random Forest feature as either evaluated supervised prediction or clearly labeled heuristic risk scoring.
6. Move heavy processing out of synchronous API requests.
7. Define security policy for CSV uploads, PII, generated reports, and external AI usage.

## Recommended Revised Architecture

User
-> React Frontend
-> FastAPI API
-> Supabase Auth + PostgreSQL + Storage
-> Background Analysis Worker
-> ML/Analytics Pipeline
-> Reports/Exports

Key principle: FastAPI should create and read work; workers should do work. Supabase should store authoritative metadata, spatially indexed incidents, job state, and durable outputs. The frontend should consume scoped, paginated, aggregate-first APIs rather than raw full datasets.

## Opinionated Bottom Line

Do not start with the map. Start with the data contract and lifecycle. If the ingestion model is loose, every downstream feature becomes unreliable: charts lie, clusters drift, predictions are unprovable, and reports sound confident without evidence.

The current architecture is acceptable for a prototype, but it is not yet strong enough for a credible analytical system. With tenant-aware schema design, PostGIS, background jobs, reproducible ML runs, and explicit security controls, CrimeLens can become a convincing full-stack AI analytics project rather than a dashboard wrapped around a CSV parser.
