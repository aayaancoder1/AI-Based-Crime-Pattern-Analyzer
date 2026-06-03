from uuid import UUID

import numpy as np
from sklearn.cluster import DBSCAN

from app.repositories.datasets import get_dataset
from app.supabase_client import get_supabase_client


class AnalysisRepositoryError(Exception):
    pass


def detect_hotspots(dataset_id: UUID) -> list[dict]:
    dataset = get_dataset(dataset_id)
    if dataset is None:
        raise AnalysisRepositoryError("Dataset not found.")

    incidents: list[dict] = []
    offset = 0
    batch_size = 1000

    try:
        while True:
            response = (
                get_supabase_client()
                .table("incidents")
                .select("latitude, longitude")
                .eq("dataset_id", str(dataset_id))
                .order("created_at", desc=True)
                .range(offset, offset + batch_size - 1)
                .execute()
            )

            incidents.extend(response.data or [])
            if not response.data or len(response.data) < batch_size:
                break
            offset += batch_size
    except Exception as exc:
        raise AnalysisRepositoryError("Incidents could not be loaded.") from exc

    if not incidents:
        return []

    coords = np.radians(np.array([[incident["latitude"], incident["longitude"]] for incident in incidents], dtype=float))

    eps_km = 1.0
    earth_radius_km = 6371.0088
    model = DBSCAN(
        eps=eps_km / earth_radius_km,
        min_samples=3,
        metric="haversine",
    )
    labels = model.fit_predict(coords)

    hotspots: list[dict] = []
    for cluster_id in sorted(set(labels)):
        if cluster_id == -1:
            continue

        cluster_points = coords[labels == cluster_id]
        if not len(cluster_points):
            continue

        cluster_points_degrees = np.degrees(cluster_points)
        hotspots.append(
            {
                "cluster_id": int(cluster_id),
                "incident_count": int(len(cluster_points)),
                "center_latitude": float(cluster_points_degrees[:, 0].mean()),
                "center_longitude": float(cluster_points_degrees[:, 1].mean()),
            }
        )

    return hotspots
