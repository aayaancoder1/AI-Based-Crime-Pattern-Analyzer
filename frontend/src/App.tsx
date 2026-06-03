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

type AnalyticsSummary = {
  total_incidents: number;
  total_hotspots: number;
  top_crime_type: string | null;
  top_district: string | null;
};

type AnalyticsCount = {
  crime_type?: string | null;
  district?: string | null;
  count: number;
};

type RiskScore = {
  district: string;
  risk_score: number;
  risk_level: "Low" | "Medium" | "High" | string;
  incident_count: number;
  hotspot_count: number;
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

function buildAnalyticsUrl(path: string, datasetId: string) {
  return `${API_BASE_URL}/analytics/${path}/${datasetId}`;
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
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummary | null>(null);
  const [crimeTypes, setCrimeTypes] = useState<AnalyticsCount[]>([]);
  const [districts, setDistricts] = useState<AnalyticsCount[]>([]);
  const [riskScores, setRiskScores] = useState<RiskScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [hotspotLoading, setHotspotLoading] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [riskLoading, setRiskLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (!submittedDatasetId) {
      setIncidents([]);
      setHotspots([]);
      setAnalyticsSummary(null);
      setCrimeTypes([]);
      setDistricts([]);
      setRiskScores([]);
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
        setAnalyticsSummary(null);
        setCrimeTypes([]);
        setDistricts([]);
        setRiskScores([]);
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load incidents.");
        setIncidents([]);
        setHotspots([]);
        setAnalyticsSummary(null);
        setCrimeTypes([]);
        setDistricts([]);
        setRiskScores([]);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    }

    loadIncidents();
    return () => controller.abort();
  }, [submittedDatasetId]);

  useEffect(() => {
    if (!submittedDatasetId) {
      return;
    }

    let cancelled = false;

    async function loadAnalytics() {
      setAnalyticsLoading(true);
      setRiskLoading(true);
      setError(null);

      try {
        const [summaryResponse, crimeTypeResponse, districtResponse] = await Promise.all([
          fetch(buildAnalyticsUrl("summary", submittedDatasetId)),
          fetch(buildAnalyticsUrl("crime-types", submittedDatasetId)),
          fetch(buildAnalyticsUrl("districts", submittedDatasetId)),
        ]);

        if (!summaryResponse.ok) {
          throw new Error(`Failed to load summary (${summaryResponse.status})`);
        }
        if (!crimeTypeResponse.ok) {
          throw new Error(`Failed to load crime type analytics (${crimeTypeResponse.status})`);
        }
        if (!districtResponse.ok) {
          throw new Error(`Failed to load district analytics (${districtResponse.status})`);
        }

        if (cancelled) {
          return;
        }

        setAnalyticsSummary((await summaryResponse.json()) as AnalyticsSummary);
        setCrimeTypes((await crimeTypeResponse.json()) as AnalyticsCount[]);
        setDistricts((await districtResponse.json()) as AnalyticsCount[]);

        const riskResponse = await fetch(buildAnalyticsUrl("risk-scores", submittedDatasetId));
        if (!riskResponse.ok) {
          throw new Error(`Failed to load risk scores (${riskResponse.status})`);
        }
        setRiskScores((await riskResponse.json()) as RiskScore[]);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load analytics.");
        setAnalyticsSummary(null);
        setCrimeTypes([]);
        setDistricts([]);
        setRiskScores([]);
      } finally {
        if (!cancelled) {
          setAnalyticsLoading(false);
          setRiskLoading(false);
        }
      }
    }

    loadAnalytics();

    return () => {
      cancelled = true;
    };
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

  function renderBarChart(
    title: string,
    items: AnalyticsCount[],
    labelKey: "crime_type" | "district",
  ) {
    const max = Math.max(...items.map((item) => item.count), 1);

    return (
      <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <div className="mt-4 space-y-3">
          {items.length ? (
            items.slice(0, 8).map((item) => {
              const label = item[labelKey] ?? "Unknown";
              const width = `${Math.max(8, (item.count / max) * 100)}%`;
              return (
                <div key={label} className="space-y-1">
                  <div className="flex items-center justify-between gap-4 text-xs text-slate-300">
                    <span className="truncate">{label}</span>
                    <span>{item.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-cyan-400"
                      style={{ width }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-sm text-slate-500">No data available.</div>
          )}
        </div>
      </section>
    );
  }

  function riskBadgeClass(level: string) {
    if (level === "High") {
      return "border-red-500/40 bg-red-500/15 text-red-200";
    }
    if (level === "Medium") {
      return "border-yellow-500/40 bg-yellow-500/15 text-yellow-200";
    }
    return "border-emerald-500/40 bg-emerald-500/15 text-emerald-200";
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

        <section className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Total Incidents", value: analyticsSummary?.total_incidents ?? totalCount },
              { label: "Total Hotspots", value: analyticsSummary?.total_hotspots ?? hotspots.length },
              { label: "Top Crime Type", value: analyticsSummary?.top_crime_type ?? "—" },
              { label: "Top District", value: analyticsSummary?.top_district ?? "—" },
            ].map((card) => (
              <div key={card.label} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{card.label}</div>
                <div className="mt-2 text-2xl font-semibold text-white">{card.value}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {renderBarChart("Crime Type Distribution", crimeTypes, "crime_type")}
            {renderBarChart("Crimes By District", districts, "district")}
          </div>

          <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-sm font-semibold text-white">Risk Scoring</h3>
              {riskLoading ? (
                <span className="text-xs text-slate-500">Loading risk scores...</span>
              ) : null}
            </div>

            <div className="mt-4 overflow-hidden rounded-lg border border-slate-800">
              <table className="min-w-full divide-y divide-slate-800 text-sm">
                <thead className="bg-slate-950/60 text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">District</th>
                    <th className="px-4 py-3 text-left font-medium">Risk Score</th>
                    <th className="px-4 py-3 text-left font-medium">Risk Level</th>
                    <th className="px-4 py-3 text-left font-medium">Incident Count</th>
                    <th className="px-4 py-3 text-left font-medium">Hotspot Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900">
                  {riskScores.length ? (
                    riskScores.map((row) => (
                      <tr key={row.district}>
                        <td className="px-4 py-3 text-slate-100">{row.district}</td>
                        <td className="px-4 py-3 text-slate-200">{row.risk_score}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${riskBadgeClass(
                              row.risk_level
                            )}`}
                          >
                            {row.risk_level}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-200">{row.incident_count}</td>
                        <td className="px-4 py-3 text-slate-200">{row.hotspot_count}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-4 py-6 text-slate-500" colSpan={5}>
                        No risk scores available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}

export default App;
