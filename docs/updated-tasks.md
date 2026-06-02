# CrimeLens - Updated Development Tasks

## Phase 0 - Foundation

### Task 1: Initialize Project Structure

Goal:
Create frontend, backend, and docs folders.

Deliverables:

- `frontend/`
- `backend/`
- `docs/`

Acceptance Criteria:

- Project has clear frontend/backend separation.
- Local development instructions are documented.

Status: TODO

---

### Task 2: Configure Supabase

Goal:
Create Supabase project and connect the application.

Deliverables:

- Supabase project.
- Supabase Auth enabled.
- Environment variables documented.
- Supabase Storage bucket for uploaded datasets and report exports.

Acceptance Criteria:

- Backend can connect to Supabase.
- Frontend can use Supabase Auth.
- Service role key is server-only.

Status: TODO

---

### Task 3: Create PostGIS Database Schema

Goal:
Apply `schema-v1.sql`.

Tables:

- `datasets`
- `crime_types`
- `incidents`
- `analysis_jobs`
- `clusters`
- `risk_scores`
- `reports`

Acceptance Criteria:

- PostGIS extension is enabled.
- Tables are created.
- Foreign keys are defined.
- Spatial indexes are created.
- RLS is enabled.
- `datasets.owner_id` and `reports.owner_id` are present.

Status: TODO

---

### Task 4: Seed Crime Types

Goal:
Create normalized crime categories.

Deliverables:

- Seed data for common crime types.
- Slugs for filtering and mapping.

Acceptance Criteria:

- Crime type filters can be populated from the database.
- Unknown raw crime labels can be mapped or preserved.

Status: TODO

---

### Task 5: Generate Sample Dataset

Goal:
Prepare a sample dataset for development.

Deliverables:

- CSV sample dataset.
- Minimum 1000 records.
- Required fields: crime type, latitude, longitude, incident date.

Acceptance Criteria:

- Dataset imports successfully.
- Sample includes enough variation for clustering and risk scoring.

Status: TODO

---

## Phase 1 - Dataset Management

### Task 6: Authentication

Goal:
Implement Supabase Auth.

Features:

- Sign up.
- Login.
- Logout.
- Protected routes.

Acceptance Criteria:

- Users can only access authenticated app routes.
- Backend receives and verifies JWTs.

Status: TODO

---

### Task 7: Dataset Upload API

Goal:
Allow authenticated users to upload CSV datasets.

Deliverables:

- Upload endpoint.
- File validation.
- Dataset metadata record with `owner_id`.
- Supabase Storage upload.

Acceptance Criteria:

- CSV uploads successfully.
- Invalid files return useful errors.
- Dataset status is created as `uploaded` or `validating`.

Status: TODO

---

### Task 8: Data Validation Pipeline

Goal:
Validate uploaded records before import.

Validation checks:

- Required columns.
- Valid coordinates.
- Valid incident dates.
- Present crime type.
- Supported file size and row count.

Acceptance Criteria:

- Validation summary is stored on the dataset.
- Invalid record counts are tracked.
- Dataset status updates correctly.

Status: TODO

---

### Task 9: Data Cleaning Pipeline

Goal:
Clean uploaded data.

Functions:

- Remove invalid coordinates.
- Standardize dates.
- Normalize crime type labels.
- Preserve raw crime type values.
- Handle missing optional values.

Acceptance Criteria:

- Clean records are ready for import.
- Clean and invalid record counts are stored.

Status: TODO

---

### Task 10: Import Incidents

Goal:
Insert cleaned incident records into PostGIS-backed database tables.

Acceptance Criteria:

- Records are visible in `incidents`.
- `crime_type_id` is assigned where possible.
- `geom` is generated correctly.
- Dataset status becomes `ready`.

Status: TODO

---

## Phase 2 - Analysis Jobs

### Task 11: Analysis Job API

Goal:
Create job-based analysis endpoints.

Deliverables:

- `POST /datasets/{dataset_id}/analysis-jobs`
- `GET /analysis-jobs/{job_id}`
- Job status updates.

Acceptance Criteria:

- Jobs are scoped to the authenticated user's datasets.
- Job status supports `queued`, `running`, `succeeded`, and `failed`.
- Job parameters are stored.

Status: TODO

---

### Task 12: Full Analysis Orchestration

Goal:
Run hotspot detection, risk scoring, and report generation through job records.

Acceptance Criteria:

- A `full_analysis` job can execute all analysis steps.
- Failures are recorded in `error_message`.
- Successful jobs store summary output.

Status: TODO

---

## Phase 3 - Frontend Dashboard

### Task 13: Dashboard Layout

Goal:
Build dashboard shell.

Components:

- Sidebar.
- Navbar.
- Dataset selector.
- Analytics section.
- Analysis job status area.

Acceptance Criteria:

- Responsive layout.
- User can see uploaded datasets and current status.

Status: TODO

---

### Task 14: Summary Statistics

Goal:
Display dataset-level metrics.

Metrics:

- Total incidents.
- Clean and invalid records.
- Crime categories.
- Active districts.

Acceptance Criteria:

- Data updates dynamically for the selected dataset.

Status: TODO

---

### Task 15: Crime Charts

Goal:
Create visualizations.

Charts:

- Crime types.
- Monthly trends.
- Daily trends.
- Hourly trends.

Acceptance Criteria:

- Charts are interactive.
- Charts are scoped to the selected dataset.

Status: TODO

---

## Phase 4 - Geospatial Analysis

### Task 16: Leaflet Map Integration

Goal:
Display incidents on a map.

Acceptance Criteria:

- Map loads correctly.
- Incidents display for the selected dataset.
- Map requests support viewport bounds.

Status: TODO

---

### Task 17: Crime Filtering

Goal:
Filter map and dashboard data.

Filters:

- Crime type.
- Date range.
- District.

Acceptance Criteria:

- Map and charts update dynamically.
- Filtering uses backend-scoped queries.

Status: TODO

---

### Task 18: Heatmap Visualization

Goal:
Display crime density.

Acceptance Criteria:

- Heatmap renders correctly.
- Heatmap respects selected filters.

Status: TODO

---

### Task 19: DBSCAN Hotspot Detection

Goal:
Identify crime hotspots using geospatially appropriate DBSCAN.

Inputs:

- Incident coordinates.
- DBSCAN parameters stored in `analysis_jobs.parameters`.

Outputs:

- Cluster assignments.
- Cluster centers.
- Cluster summaries.

Acceptance Criteria:

- Hotspots are stored in `clusters`.
- Hotspots are visible on the map.
- DBSCAN does not treat raw latitude/longitude as plain Cartesian coordinates.

Status: TODO

---

### Task 20: Cluster Reporting

Goal:
Generate hotspot summaries.

Outputs:

- Cluster size.
- Dominant crime type.
- Density score.
- Risk level.

Acceptance Criteria:

- Cluster summaries are available in the UI.
- Cluster summaries are tied to an analysis job.

Status: TODO

---

## Phase 5 - Explainable Risk Scoring

### Task 21: Risk Scoring Engine

Goal:
Replace Random Forest prediction with explainable historical risk scoring.

Risk score components:

- Incident count.
- Density.
- Recency.
- Crime mix.

Outputs:

- Numeric risk score.
- Low, medium, or high risk level.
- Component scores.
- Explanation text.

Acceptance Criteria:

- Risk scores are stored in `risk_scores`.
- Scores are tied to dataset, analysis job, and cluster where applicable.
- UI labels risk as historical assessment, not future prediction.

Status: TODO

---

### Task 22: Risk Visualization

Goal:
Display risk levels and explanations.

Acceptance Criteria:

- Clusters show low, medium, or high risk.
- Users can inspect why a score was assigned.

Status: TODO

---

## Phase 6 - AI Insights And Reports

### Task 23: Insight Generation

Goal:
Generate analyst-friendly summaries from computed metrics.

Examples:

- Most active crime regions.
- Emerging hotspots based on historical trend changes.
- High-risk historical areas.

Acceptance Criteria:

- Insights are generated from stored metrics.
- Insights avoid unsupported future prediction claims.

Status: TODO

---

### Task 24: Report Generation

Goal:
Generate dataset and analysis reports.

Report types:

- Dataset summary.
- Hotspot report.
- Risk score report.
- Full report.

Acceptance Criteria:

- Reports are stored in `reports`.
- Reports include `owner_id`.
- Reports are tied to dataset and analysis job.

Status: TODO

---

### Task 25: Report Export

Goal:
Export reports.

Formats:

- PDF.
- CSV.

Acceptance Criteria:

- Reports are downloadable.
- CSV exports sanitize formula-like values.

Status: TODO

---

## Phase 7 - Deployment And Testing

### Task 26: Deploy Backend

Goal:
Deploy FastAPI backend.

Acceptance Criteria:

- Public API is available.
- Environment variables are configured.
- Backend verifies Supabase JWTs.

Status: TODO

---

### Task 27: Deploy Frontend

Goal:
Deploy React application.

Acceptance Criteria:

- Public frontend URL is available.
- Frontend can authenticate and call the backend.

Status: TODO

---

### Task 28: End-to-End Testing

Goal:
Verify the complete workflow.

Workflow:

Upload -> Validate -> Import -> Analyze -> Visualize -> Score Risk -> Report

Acceptance Criteria:

- No critical bugs.
- A user cannot access another user's datasets or reports.
- PostGIS-backed map queries work.
- Risk scoring explanations are visible.

Status: TODO
