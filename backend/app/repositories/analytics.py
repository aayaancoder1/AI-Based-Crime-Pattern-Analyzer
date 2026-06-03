from collections import Counter
from uuid import UUID

import numpy as np
from sklearn.cluster import DBSCAN

from app.repositories.analysis import detect_hotspots
from app.repositories.datasets import get_dataset
from app.supabase_client import get_supabase_client


class AnalyticsRepositoryError(Exception):
    pass


def _fetch_all_incidents(dataset_id: UUID) -> list[dict]:
    incidents: list[dict] = []
    offset = 0
    batch_size = 1000

    try:
        while True:
            response = (
                get_supabase_client()
                .table("incidents")
                .select("crime_type, district")
                .eq("dataset_id", str(dataset_id))
                .range(offset, offset + batch_size - 1)
                .execute()
            )

            incidents.extend(response.data or [])
            if not response.data or len(response.data) < batch_size:
                break
            offset += batch_size
    except Exception as exc:
        raise AnalyticsRepositoryError("Incidents could not be loaded.") from exc

    return incidents


def _fetch_all_incident_points(dataset_id: UUID) -> list[dict]:
    incidents: list[dict] = []
    offset = 0
    batch_size = 1000

    try:
        while True:
            response = (
                get_supabase_client()
                .table("incidents")
                .select("crime_type, district, latitude, longitude")
                .eq("dataset_id", str(dataset_id))
                .range(offset, offset + batch_size - 1)
                .execute()
            )

            incidents.extend(response.data or [])
            if not response.data or len(response.data) < batch_size:
                break
            offset += batch_size
    except Exception as exc:
        raise AnalyticsRepositoryError("Incidents could not be loaded.") from exc

    return incidents


def get_summary(dataset_id: UUID) -> dict:
    dataset = get_dataset(dataset_id)
    if dataset is None:
        raise AnalyticsRepositoryError("Dataset not found.")

    incidents = _fetch_all_incidents(dataset_id)
    total_incidents = len(incidents)
    hotspots = detect_hotspots(dataset_id)

    crime_counter = Counter(
        incident["crime_type"].strip()
        for incident in incidents
        if incident.get("crime_type") and str(incident["crime_type"]).strip()
    )
    district_counter = Counter(
        incident["district"].strip()
        for incident in incidents
        if incident.get("district") and str(incident["district"]).strip()
    )

    return {
        "total_incidents": total_incidents,
        "total_hotspots": len(hotspots),
        "top_crime_type": crime_counter.most_common(1)[0][0] if crime_counter else None,
        "top_district": district_counter.most_common(1)[0][0] if district_counter else None,
    }


def get_crime_type_counts(dataset_id: UUID) -> list[dict]:
    dataset = get_dataset(dataset_id)
    if dataset is None:
        raise AnalyticsRepositoryError("Dataset not found.")

    incidents = _fetch_all_incidents(dataset_id)
    counter = Counter(
        incident["crime_type"].strip()
        for incident in incidents
        if incident.get("crime_type") and str(incident["crime_type"]).strip()
    )

    return [
        {"crime_type": crime_type, "count": count}
        for crime_type, count in counter.most_common()
    ]


def get_district_counts(dataset_id: UUID) -> list[dict]:
    dataset = get_dataset(dataset_id)
    if dataset is None:
        raise AnalyticsRepositoryError("Dataset not found.")

    incidents = _fetch_all_incidents(dataset_id)
    counter = Counter(
        incident["district"].strip()
        for incident in incidents
        if incident.get("district") and str(incident["district"]).strip()
    )

    return [
        {"district": district, "count": count}
        for district, count in counter.most_common()
    ]


def get_risk_scores(dataset_id: UUID) -> list[dict]:
    dataset = get_dataset(dataset_id)
    if dataset is None:
        raise AnalyticsRepositoryError("Dataset not found.")

    incidents = _fetch_all_incident_points(dataset_id)
    if not incidents:
        return []

    district_buckets: dict[str, list[dict]] = {}
    for incident in incidents:
        district = str(incident.get("district") or "").strip()
        if not district:
            continue
        district_buckets.setdefault(district, []).append(incident)

    if not district_buckets:
        return []

    severity_weights = {
        "theft": 1,
        "burglary": 2,
        "vehicle theft": 2,
        "robbery": 3,
        "assault": 4,
    }

    hotspot_count_by_district: Counter[str] = Counter()
    try:
        hotspot_points = detect_hotspots(dataset_id)
    except Exception as exc:
        raise AnalyticsRepositoryError("Hotspots could not be loaded.") from exc

    if hotspot_points:
        coords = np.array(
            [[incident["latitude"], incident["longitude"]] for incident in incidents],
            dtype=float,
        )
        labels = DBSCAN(
            eps=1.0 / 6371.0088,
            min_samples=3,
            metric="haversine",
        ).fit_predict(np.radians(coords))

        for cluster_id in sorted(set(labels)):
            if cluster_id == -1:
                continue

            member_indexes = np.where(labels == cluster_id)[0]
            member_districts = [
                str(incidents[index].get("district") or "").strip()
                for index in member_indexes
                if str(incidents[index].get("district") or "").strip()
            ]
            if not member_districts:
                continue

            district = Counter(member_districts).most_common(1)[0][0]
            hotspot_count_by_district[district] += 1

    district_rows: list[dict] = []
    max_incidents = max(len(items) for items in district_buckets.values()) or 1
    max_hotspots = max(hotspot_count_by_district.values()) if hotspot_count_by_district else 1
    max_severity = 4.0

    for district, district_incidents in district_buckets.items():
        incident_count = len(district_incidents)
        hotspot_count = int(hotspot_count_by_district.get(district, 0))

        severity_total = 0
        for incident in district_incidents:
            crime_type = str(incident.get("crime_type") or "").strip().lower()
            severity_total += severity_weights.get(crime_type, 1)

        severity_average = severity_total / incident_count if incident_count else 0

        incident_component = (incident_count / max_incidents) * 100.0
        hotspot_component = (hotspot_count / max_hotspots) * 100.0 if max_hotspots else 0.0
        severity_component = (severity_average / max_severity) * 100.0

        risk_score = round(
            (incident_component * 0.4) + (hotspot_component * 0.4) + (severity_component * 0.2)
        )
        risk_score = max(0, min(100, risk_score))

        if risk_score >= 70:
            risk_level = "High"
        elif risk_score >= 40:
            risk_level = "Medium"
        else:
            risk_level = "Low"

        district_rows.append(
            {
                "district": district,
                "risk_score": int(risk_score),
                "risk_level": risk_level,
                "incident_count": incident_count,
                "hotspot_count": hotspot_count,
            }
        )

    district_rows.sort(key=lambda row: row["risk_score"], reverse=True)
    return district_rows
