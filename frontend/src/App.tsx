function App() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
            CrimeLens
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-white sm:text-6xl">
            Crime pattern analysis for historical datasets.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            A research-focused platform for geospatial exploration, hotspot
            analysis, and explainable historical risk scoring.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-base font-semibold text-white">Frontend</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              React, TypeScript, Vite, and Tailwind CSS are ready.
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-base font-semibold text-white">Backend</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              FastAPI is scaffolded with a basic health check endpoint.
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-base font-semibold text-white">Database</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Supabase migrations define PostGIS-backed core tables.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;
