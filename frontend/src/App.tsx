import { useEffect, useRef, useState } from "react";

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

type Hotspot = {
  cluster_id: number;
  incident_count: number;
  center_latitude: number;
  center_longitude: number;
};

type HotspotListResponse = {
  hotspots: Hotspot[];
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
  const hotspotLayerRef = useRef<any>(null);

  const [datasetId, setDatasetId] = useState(DEFAULT_DATASET_ID);
  const [submittedDatasetId, setSubmittedDatasetId] = useState(DEFAULT_DATASET_ID);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [loading, setLoading] = useState(false);
  const [hotspotLoading, setHotspotLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (!submittedDatasetId) {
      setIncidents([]);
      setHotspots([]);
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
        setHotspots([]);
        setTotalCount(payload.total_count);
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load incidents.");
        setIncidents([]);
        setHotspots([]);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    }

    loadIncidents();
    return () => controller.abort();
  }, [submittedDatasetId]);

  useEffect(() => {
    if (!mapRef.current || !window.L || mapInstanceRef.current) {
      return;
    }

    const map = window.L.map(mapRef.current, {
      center: [20, 0],
      zoom: 2,
      zoomControl: true,
    });

    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    mapInstanceRef.current = map;
    layerGroupRef.current = window.L.layerGroup().addTo(map);
    hotspotLayerRef.current = window.L.layerGroup().addTo(map);

    const handleResize = () => {
      map.invalidateSize();
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(mapRef.current);

    const raf = window.requestAnimationFrame(() => {
      map.invalidateSize();
    });

    return () => {
      window.cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
      layerGroupRef.current = null;
      hotspotLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup || !window.L) {
      return;
    }

    layerGroup.clearLayers();

    if (!incidents.length) {
      map.setView([20, 0], 2);
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
  }, [incidents]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const hotspotLayer = hotspotLayerRef.current;
    if (!map || !hotspotLayer || !window.L) {
      return;
    }

    hotspotLayer.clearLayers();

    hotspots.forEach((hotspot) => {
      const circle = window.L.circleMarker(
        [hotspot.center_latitude, hotspot.center_longitude],
        {
          radius: Math.max(8, Math.min(24, 6 + hotspot.incident_count)),
          color: "#f59e0b",
          weight: 2,
          fillColor: "#f97316",
          fillOpacity: 0.35,
        }
      );

      circle.bindPopup(`
        <div style="font-size:14px; line-height:1.45">
          <div style="font-weight:600; margin-bottom:4px">Hotspot ${hotspot.cluster_id}</div>
          <div>${hotspot.incident_count} incidents</div>
        </div>
      `);
      circle.addTo(hotspotLayer);
    });
  }, [hotspots]);

  async function detectHotspots() {
    if (!submittedDatasetId) {
      return;
    }

    setHotspotLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/analysis/hotspots/${submittedDatasetId}`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to detect hotspots (${response.status})`);
      }

      const payload = (await response.json()) as HotspotListResponse;
      setHotspots(payload.hotspots);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to detect hotspots.");
      setHotspots([]);
    } finally {
      setHotspotLoading(false);
    }
  }

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
            <button
              className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!submittedDatasetId || loading || hotspotLoading}
              type="button"
              onClick={detectHotspots}
            >
              {hotspotLoading ? "Detecting..." : "Detect Hotspots"}
            </button>
          </form>
        </header>

        {error ? (
          <div className="mb-4 rounded-lg border border-rose-900 bg-rose-950 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <section className="relative min-h-[calc(100vh-11rem)] overflow-hidden rounded-lg border border-slate-800 bg-slate-900 shadow-lg shadow-black/20">
          <div ref={mapRef} className="h-full min-h-[calc(100vh-11rem)] w-full" />
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 text-sm text-slate-100">
              Loading incidents...
            </div>
          ) : null}
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
