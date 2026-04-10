import { useCallback, useEffect, useMemo, useState } from 'react'
import IndiaRouteMap from '../components/IndiaRouteMap'
import LoadingSpinner from '../components/LoadingSpinner'
import WeatherStrip from '../components/WeatherStrip'
import {
  fetchAirports,
  fetchRoutes,
  generateScenario,
  runAlgorithm,
} from '../services/api'
import { formatApiError } from '../utils/apiError'

const ALGORITHMS = [
  { value: 'astar', label: 'A* (heuristic)' },
  { value: 'dijkstra', label: "Dijkstra's" },
  { value: 'bfs', label: 'BFS (fewest hops)' },
  { value: 'dfs', label: 'DFS (first path)' },
  { value: 'bellman_ford', label: 'Bellman–Ford' },
  { value: 'floyd_warshall', label: 'Floyd–Warshall' },
  { value: 'tsp', label: 'TSP (full tour)' },
]

export default function HomePage() {
  const [airports, setAirports] = useState([])
  const [routes, setRoutes] = useState([])
  const [source, setSource] = useState('DEL')
  const [destination, setDestination] = useState('HYD')
  const [algorithm, setAlgorithm] = useState('astar')
  const [weather, setWeather] = useState(true)
  const [weatherSeverity, setWeatherSeverity] = useState(1.15)
  const [congestion, setCongestion] = useState(true)
  const [congestionLevel, setCongestionLevel] = useState(1.2)
  const [noFly, setNoFly] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [a, r] = await Promise.all([fetchAirports(), fetchRoutes()])
        if (!cancelled) {
          setAirports(a)
          setRoutes(r)
        }
      } catch (e) {
        if (!cancelled) setError(formatApiError(e))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const ids = useMemo(() => airports.map((x) => x.id).sort(), [airports])

  const constraints = useMemo(
    () => ({
      weather_enabled: weather,
      weather_severity: weatherSeverity,
      congestion_enabled: congestion,
      congestion_level: congestionLevel,
      no_fly_airport_ids: noFly,
    }),
    [weather, weatherSeverity, congestion, congestionLevel, noFly],
  )

  const onRun = useCallback(async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await runAlgorithm({
        source,
        destination,
        algorithm,
        constraints,
      })
      setResult(data)
    } catch (e) {
      setError(formatApiError(e))
    } finally {
      setLoading(false)
    }
  }, [source, destination, algorithm, constraints])

  const onScenario = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { constraints: c } = await generateScenario({
        seed: Math.floor(Math.random() * 1e9),
        block_fraction: 0.08,
      })
      setWeather(c.weather_enabled)
      setWeatherSeverity(c.weather_severity)
      setCongestion(c.congestion_enabled)
      setCongestionLevel(c.congestion_level)
      setNoFly(c.no_fly_airport_ids || [])
    } catch (e) {
      setError(formatApiError(e))
    } finally {
      setLoading(false)
    }
  }, [])

  const useSuggested = useCallback(() => {
    if (result?.suggested_algorithm) setAlgorithm(result.suggested_algorithm)
  }, [result])

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="skyroute-fade-up mb-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300/80">
          AI route optimization
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-white md:text-4xl">
          SkyRoute India &amp; South Asia
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-400">
          Domestic and international legs modeled as a graph: hub connections can undercut expensive
          nonstops (e.g. DEL–HYD). Dijkstra / A* find minimum fare paths; map + live wind from
          Open-Meteo.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-5">
        <section className="skyroute-fade-up skyroute-stagger-1 rounded-2xl border border-sky-500/20 bg-slate-900/40 p-6 shadow-xl backdrop-blur lg:col-span-2">
          <h2 className="text-lg font-semibold text-white">Mission controls</h2>
          <p className="mt-1 text-xs text-slate-500">Select endpoints, algorithm, and environment.</p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-400">Origin</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                {ids.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400">Destination</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                disabled={algorithm === 'tsp'}
              >
                {ids.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
              {algorithm === 'tsp' && (
                <p className="mt-1 text-[11px] text-amber-200/80">
                  TSP builds a full tour; destination field is ignored (returns to origin).
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400">Algorithm</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value)}
              >
                {ALGORITHMS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-4 border-t border-slate-800 pt-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={weather}
                  onChange={(e) => setWeather(e.target.checked)}
                  className="rounded border-slate-600"
                />
                Weather
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={congestion}
                  onChange={(e) => setCongestion(e.target.checked)}
                  className="rounded border-slate-600"
                />
                Congestion
              </label>
            </div>
            {weather && (
              <div>
                <label className="text-xs text-slate-500">
                  Weather severity: {weatherSeverity.toFixed(2)}×
                </label>
                <input
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.05}
                  value={weatherSeverity}
                  onChange={(e) => setWeatherSeverity(Number(e.target.value))}
                  className="w-full accent-sky-400"
                />
              </div>
            )}
            {congestion && (
              <div>
                <label className="text-xs text-slate-500">
                  Congestion: {congestionLevel.toFixed(2)}×
                </label>
                <input
                  type="range"
                  min={1}
                  max={2.5}
                  step={0.05}
                  value={congestionLevel}
                  onChange={(e) => setCongestionLevel(Number(e.target.value))}
                  className="w-full accent-violet-400"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-slate-400">No-fly airports</label>
              <select
                multiple
                className="mt-1 h-24 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-2 py-1 text-xs text-slate-100"
                value={noFly}
                onChange={(e) =>
                  setNoFly(Array.from(e.target.selectedOptions).map((o) => o.value))
                }
              >
                {ids.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-slate-500">Hold Ctrl/Cmd to select multiple.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onRun}
                disabled={loading || !ids.length}
                className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow hover:bg-sky-400 disabled:opacity-50"
              >
                {loading ? 'Running…' : 'Run algorithm'}
              </button>
              <button
                type="button"
                onClick={onScenario}
                disabled={loading}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
              >
                Random scenario
              </button>
              {result?.suggested_algorithm && (
                <button
                  type="button"
                  onClick={useSuggested}
                  className="rounded-lg border border-violet-500/40 px-3 py-2 text-xs text-violet-200 hover:bg-violet-500/10"
                >
                  Use suggested: {result.suggested_algorithm}
                </button>
              )}
            </div>

            {loading && <LoadingSpinner />}
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-200">
                {typeof error === 'string' ? error : JSON.stringify(error)}
              </div>
            )}
          </div>
        </section>

        <section className="space-y-6 lg:col-span-3">
          <div className="skyroute-fade-up skyroute-stagger-2 rounded-2xl border border-sky-500/20 bg-slate-900/40 p-6 shadow-xl backdrop-blur">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Live map &amp; network</h2>
                <p className="text-xs text-slate-500">
                  Satellite basemap; faint lines are scheduled edges; cyan is your optimized route.
                </p>
              </div>
              {result?.suggestion_reason && (
                <p className="max-w-md text-right text-[11px] leading-relaxed text-slate-400">
                  <span className="text-sky-300/90">Suggestion: </span>
                  {result.suggestion_reason}
                </p>
              )}
            </div>
            <div className="mt-4">
              <IndiaRouteMap
                airports={airports}
                routes={routes}
                path={result?.path || []}
                noFlyIds={noFly}
              />
            </div>
            <div className="mt-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Weather &amp; wind (terminals)
              </h3>
              <WeatherStrip originId={source} destId={destination} />
            </div>
          </div>

          <div className="skyroute-fade-up skyroute-stagger-3 rounded-2xl border border-sky-500/20 bg-slate-900/40 p-6 shadow-xl backdrop-blur">
            <h2 className="text-lg font-semibold text-white">Results</h2>
            {!result && (
              <p className="mt-3 text-sm text-slate-500">Run an algorithm to see path, cost, and timing.</p>
            )}
            {result && (
              <>
                {result.recommendation_summary && (
                  <div className="skyroute-fade-up skyroute-stagger-1 mt-3 rounded-lg border border-emerald-500/25 bg-emerald-950/30 px-3 py-2 text-sm leading-relaxed text-emerald-100/95">
                    {result.recommendation_summary}
                  </div>
                )}
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-lg bg-slate-950/60 p-3 sm:col-span-2">
                  <dt className="text-xs uppercase text-slate-500">Path</dt>
                  <dd className="mt-1 font-mono text-xs text-sky-100">{result.path.join(' → ')}</dd>
                </div>
                <div className="rounded-lg bg-slate-950/60 p-3">
                  <dt className="text-xs uppercase text-slate-500">Best fare (sim.)</dt>
                  <dd className="mt-1 text-lg font-semibold text-white">
                    {(result.currency || 'INR') === 'INR' ? '₹' : '$'}
                    {result.cost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </dd>
                </div>
                {result.direct_leg_cost != null && (
                  <div className="rounded-lg bg-slate-950/60 p-3">
                    <dt className="text-xs uppercase text-slate-500">Direct nonstop (if listed)</dt>
                    <dd className="mt-1 text-lg font-semibold text-amber-200/95">
                      ₹{result.direct_leg_cost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </dd>
                  </div>
                )}
                <div className="rounded-lg bg-slate-950/60 p-3">
                  <dt className="text-xs uppercase text-slate-500">Great-circle distance (path)</dt>
                  <dd className="mt-1 text-slate-100">
                    {result.distance_km.toLocaleString(undefined, { maximumFractionDigits: 0 })} km
                  </dd>
                </div>
                <div className="rounded-lg bg-slate-950/60 p-3">
                  <dt className="text-xs uppercase text-slate-500">Server time / nodes</dt>
                  <dd className="mt-1 text-slate-100">
                    {result.execution_time_ms.toFixed(3)} ms · {result.nodes_explored} nodes explored
                  </dd>
                </div>
              </dl>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
