import { useEffect, useState, useCallback, useMemo } from 'react'
import ATC3DGlobe from '../components/ATC3DGlobe'
import { fetchAirports, fetchRoutes, runAlgorithm } from '../services/api'
import { formatApiError } from '../utils/apiError'

const ALGORITHMS = [
  { value: 'astar', label: 'A* (heuristic)' },
  { value: 'dijkstra', label: "Dijkstra's" },
  { value: 'bfs', label: 'BFS (fewest hops)' },
]

export default function GlobeRadarPage() {
  const [airports, setAirports] = useState([])
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [source, setSource] = useState('JFK')
  const [destination, setDestination] = useState('SIN')
  const [algorithm, setAlgorithm] = useState('astar')
  const [result, setResult] = useState(null)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [a, r] = await Promise.all([fetchAirports('global'), fetchRoutes('global')])
        if (!cancelled) {
          setAirports(a)
          setRoutes(r)
          // Default source to first airport if JFK not found
          if(a.length > 0 && !a.find(ap => ap.id === 'JFK')) setSource(a[0].id)
          if(a.length > 0 && !a.find(ap => ap.id === 'SIN')) setDestination(a[a.length-1].id)
        }
      } catch (e) {
        if (!cancelled) setError(formatApiError(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const ids = useMemo(() => airports.map((x) => x.id).sort(), [airports])

  const onRun = useCallback(async () => {
    setRunning(true)
    setError(null)
    setResult(null)
    try {
      const data = await runAlgorithm({
        source,
        destination,
        algorithm,
        dataset: 'global',
        constraints: {
          weather_enabled: true,
          weather_severity: 1.0,
          congestion_enabled: true,
          congestion_level: 1.0,
          no_fly_airport_ids: []
        }
      })
      setResult(data)
    } catch (e) {
      setError(formatApiError(e))
    } finally {
      setRunning(false)
    }
  }, [source, destination, algorithm])

  return (
    <div className="mx-auto flex max-w-6xl flex-col px-4 py-8 min-h-[calc(100vh-140px)]">
      <header className="mb-6 border-b border-slate-800 pb-4">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-semibold text-white tracking-widest uppercase font-mono">
              Global ATC <span className="text-emerald-500">Radar</span>
            </h1>
            <p className="mt-1 text-xs text-slate-500 font-mono">
              LIVE INTERCONTINENTAL TRAFFIC MONITORING
            </p>
          </div>
          <div className="text-right">
             <div className="inline-flex items-center gap-2 rounded bg-emerald-950/40 px-2 py-1 text-[10px] font-mono text-emerald-400 border border-emerald-900/50">
               <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
               </span>
               DATALINK ACTIVE
             </div>
          </div>
        </div>
      </header>

      {error ? (
         <div className="rounded border border-red-500/30 bg-red-950/40 p-4 font-mono text-xs text-red-200 mb-4">
           ERROR: {typeof error === 'string' ? error : JSON.stringify(error)}
         </div>
      ) : null}

      {loading ? (
         <div className="flex flex-1 items-center justify-center font-mono text-slate-500">
           CONNECTING SATELLITE FEED...
         </div>
      ) : (
        <div className="flex-1 flex flex-col xl:flex-row gap-6">
           <div className="flex-1 rounded-xl p-1 border border-slate-800 bg-slate-900/50 shadow-2xl relative">
              <ATC3DGlobe airports={airports} routes={routes} path={result?.path || []} />
           </div>
           
           <div className="w-full xl:w-80 flex flex-col gap-6 font-mono">
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-5 shadow-inner">
                <h2 className="text-xs uppercase text-slate-500 mb-4 border-b border-slate-800 pb-2">Flight Command</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] uppercase text-slate-400 block mb-1">Origin</label>
                    <select
                      className="w-full rounded bg-slate-900 border border-slate-700 px-2 py-1.5 text-xs text-white"
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                    >
                      {ids.map((id) => (
                        <option key={id} value={id}>{id}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-slate-400 block mb-1">Destination</label>
                    <select
                      className="w-full rounded bg-slate-900 border border-slate-700 px-2 py-1.5 text-xs text-white"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                    >
                      {ids.map((id) => (
                        <option key={id} value={id}>{id}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-slate-400 block mb-1">Algorithm</label>
                    <select
                      className="w-full rounded bg-slate-900 border border-slate-700 px-2 py-1.5 text-xs text-white"
                      value={algorithm}
                      onChange={(e) => setAlgorithm(e.target.value)}
                    >
                      {ALGORITHMS.map((a) => (
                        <option key={a.value} value={a.value}>{a.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <button
                    onClick={onRun}
                    disabled={running}
                    className="w-full mt-2 rounded bg-emerald-600/20 border border-emerald-500/50 hover:bg-emerald-600/40 text-emerald-300 py-2 text-xs font-bold tracking-widest transition"
                  >
                    {running ? 'COMPUTING...' : 'INITIATE ROUTING'}
                  </button>
                </div>
              </div>

              {result && (
                <div className="rounded-xl border border-sky-500/20 bg-slate-950/80 p-5 shadow-inner flex-1">
                  <h2 className="text-xs uppercase text-sky-500 mb-4 border-b border-sky-900 pb-2">Active Flight Path</h2>
                  <div className="space-y-4">
                     <div>
                       <div className="text-[10px] text-slate-500 uppercase">Waypoints</div>
                       <div className="text-xs text-slate-300 mt-1 leading-relaxed">
                         {result.path.join(' ➔ ')}
                       </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase">Cost (USD)</div>
                          <div className="text-sm font-bold text-amber-400">${result.cost.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase">Distance</div>
                          <div className="text-sm font-bold text-sky-400">{result.distance_km.toLocaleString(undefined, { maximumFractionDigits: 0 })} km</div>
                        </div>
                     </div>
                  </div>
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  )
}
