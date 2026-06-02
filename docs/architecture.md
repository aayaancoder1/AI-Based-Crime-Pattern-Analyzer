# CrimeLens – System Architecture

## High-Level Architecture

User
↓
React Frontend
↓
FastAPI Backend (Hugging Face Space)
↓
Supabase Database
↓
Machine Learning Services

---

## Components

### Frontend Layer

Technology:

* React
* TypeScript
* TailwindCSS
* Leaflet

Responsibilities:

* User authentication
* Dataset upload
* Dashboard visualization
* Heatmap rendering
* Report viewing
* Analytics interface

---

### Backend Layer

Technology:

* FastAPI
* Python

Responsibilities:

* API endpoints
* Dataset processing
* Validation
* ML orchestration
* Report generation
* Supabase communication

---

### Database Layer

Technology:

* Supabase PostgreSQL

Responsibilities:

* Store crime incidents
* Store cluster results
* Store predictions
* Store reports

---

## Database Design

### incidents

Stores crime records.

Fields:

* id
* dataset_id
* crime_type
* latitude
* longitude
* incident_date
* district
* description
* created_at

---

### datasets

Stores uploaded datasets.

Fields:

* id
* filename
* upload_date
* total_records
* status

---

### clusters

Stores hotspot results.

Fields:

* id
* cluster_id
* center_latitude
* center_longitude
* crime_count
* risk_level
* created_at

---

### predictions

Stores model predictions.

Fields:

* id
* zone_id
* predicted_risk
* confidence_score
* prediction_date

---

### reports

Stores generated reports.

Fields:

* id
* title
* summary
* generated_at

---

## Machine Learning Pipeline

Dataset Upload
↓
Data Cleaning
↓
Feature Engineering
↓
DBSCAN Clustering
↓
Hotspot Creation
↓
Feature Extraction
↓
Random Forest Model
↓
Risk Prediction
↓
Database Storage
↓
Visualization

---

## ML Models

### Hotspot Detection

Algorithm:
DBSCAN

Inputs:

* latitude
* longitude

Outputs:

* hotspot clusters
* noise points

Reason:

* Handles irregular cluster shapes
* Works well with geographic data
* Automatically detects outliers

---

### Risk Prediction

Algorithm:
Random Forest Classifier

Inputs:

* cluster density
* crime frequency
* crime type
* day of week
* month
* location features

Outputs:

* low risk
* medium risk
* high risk

Reason:

* Interpretable
* Fast
* Strong baseline performance

---

## API Structure

GET /datasets

POST /datasets/upload

GET /incidents

GET /clusters

POST /analyze

GET /predictions

GET /reports

---

## Deployment Architecture

Frontend:
Vercel

Backend:
Hugging Face Spaces

Database:
Supabase

Storage:
Supabase Storage

---

## Security

* Row Level Security (RLS)
* JWT Authentication
* Input Validation
* File Upload Validation

---

## Future Architecture Improvements

* Background jobs
* Caching
* Streaming analytics
* Real-time updates
* AI assistant integration

---

## Development Roadmap

Phase 1:

* Database
* Dataset upload
* Dashboard

Phase 2:

* Maps
* Heatmaps
* Clustering

Phase 3:

* Prediction engine

Phase 4:

* AI insight generation

Phase 5:

* Deployment and testing
