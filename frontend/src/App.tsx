import { useEffect, useMemo, useRef, useState } from "react";

type Incident = {
  id: string;
  dataset_id: string;
  crime_type: string;
  latitude: number;
  longitude: number;
  incident_date: string;
  district: string | null;
  description: string | null;
  created_at: string;
};

type IncidentListResponse = {
  incidents: Incident[];
  total_count: number;
};

declare global {
  interface Window {
    L: any;
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
const DEFAULT_DATASET_ID = import.meta.env.VITE_DEFAULT_DATASET_ID ?? "";

function buildIncidentUrl(datasetId: string) {
  const params = new URLSearchParams({
    dataset_id: datasetId,
    limit: "1000",
    offset: "0",
  });
  return `${API_BASE_URL}/incidents?${params.toString()}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function App() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);

  const [datasetId, setDatasetId] = useState(DEFAULT_DATASET_ID);
  const [submittedDatasetId, setSubmittedDatasetId] = useState(DEFAULT_DATASET_ID);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (!submittedDatasetId) {
      setIncidents([]);
      setTotalCount(0);
      return;
    }

    const controller = new AbortController();

    async function loadIncidents() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(buildIncidentUrl(submittedDatasetId), {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to load incidents (${response.status})`);
        }

        const payload = (await response.json()) as IncidentListResponse;
        setIncidents(payload.incidents);
        setTotalCount(payload.total_count);
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load incidents.");
        setIncidents([]);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    }

    loadIncidents();
    return () => controller.abort();
  }, [submittedDatasetId]);

  const center = useMemo<[number, number]>(() => {
    if (!incidents.length) {
      return [20, 0];
    }

    const avgLat = incidents.reduce((sum, incident) => sum + incident.latitude, 0) / incidents.length;
    const avgLng = incidents.reduce((sum, incident) => sum + incident.longitude, 0) / incidents.length;
    return [avgLat, avgLng];
  }, [incidents]);

  useEffect(() => {
    if (!mapRef.current || !window.L) {
      return;
    }

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = window.L.map(mapRef.current, {
        center,
        zoom: incidents.length ? 10 : 2,
        zoomControl: true,
      });

      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(mapInstanceRef.current);

      layerGroupRef.current = window.L.layerGroup().addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) {
      return;
    }

    layerGroup.clearLayers();

    if (!incidents.length) {
      map.setView(center, 2);
      return;
    }

    const bounds = window.L.latLngBounds(incidents.map((incident) => [incident.latitude, incident.longitude]));
    map.fitBounds(bounds, { padding: [24, 24] });

    incidents.forEach((incident) => {
      const marker = window.L.marker([incident.latitude, incident.longitude]);
      marker.bindPopup(`
        <div style="font-size:14px; line-height:1.45">
          <div style="font-weight:600; margin-bottom:4px">${incident.crime_type}</div>
          <div>${formatDate(incident.incident_date)}</div>
          <div>${incident.district || "No district listed"}</div>
          <div>${incident.description || "No description available"}</div>
        </div>
      `);
      marker.addTo(layerGroup);
    });
  }, [center, incidents]);

  useEffect(() => {
    return () => {
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="mb-4 flex flex-col gap-4 rounded-lg border border-slate-800 bg-slate-900/80 p-4 shadow-lg shadow-black/20 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
              CrimeLens
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-white">Crime Map</h1>
            <p className="mt-1 text-sm text-slate-400">
              {totalCount} incident{totalCount === 1 ? "" : "s"} loaded
            </p>
          </div>

          <form
            className="flex w-full max-w-xl gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setSubmittedDatasetId(datasetId.trim());
            }}
          >
            <input
              aria-label="Dataset ID"
              className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-400"
              placeholder="Paste dataset ID"
              value={datasetId}
              onChange={(event) => setDatasetId(event.target.value)}
            />
            <button
              className="rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
              type="submit"
            >
              Load
            </button>
          </form>
        </header>

        {error ? (
          <div className="mb-4 rounded-lg border border-rose-900 bg-rose-950 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <section className="relative min-h-[calc(100vh-11rem)] overflow-hidden rounded-lg border border-slate-800 bg-slate-900 shadow-lg shadow-black/20">
          {loading ? (
            <div className="flex h-full min-h-[calc(100vh-11rem)] items-center justify-center text-sm text-slate-400">
              Loading incidents...
            </div>
          ) : (
            <div ref={mapRef} className="h-full min-h-[calc(100vh-11rem)] w-full" />
          )}
          {!loading && !incidents.length ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex min-h-[calc(100vh-11rem)] items-center justify-center px-6 text-center text-sm text-slate-400">
              {submittedDatasetId
                ? "No incidents returned for this dataset."
                : "Enter a dataset ID to load the map."}
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}

export default App;
