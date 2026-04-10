import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import LoadingSpinner from '../components/LoadingSpinner'
import { compare, fetchAirports } from '../services/api'
import { formatApiError } from '../utils/apiError'

export default function ComparePage() {
  const [airports, setAirports] = useState([])
  const [source, setSource] = useState('DEL')
  const [destination, setDestination] = useState('HYD')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  useEffect(() => {
    fetchAirports()
      .then(setAirports)
      .catch((e) => setError(formatApiError(e)))
  }, [])

  const ids = airports.map((a) => a.id).sort()

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await compare({ source, destination })
      setData(res)
    } catch (e) {
      setError(formatApiError(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (ids.length) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const chartCost = data?.results?.map((r) => ({
    name: r.algorithm,
    cost: r.cost === Infinity ? null : r.cost,
    ms: r.execution_time_ms,
  }))

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Algorithm comparison</h1>
        <p className="mt-2 text-sm text-slate-400">
          Side-by-side costs and runtimes for the same origin–destination. TSP row reflects a full
          tour cost (different objective than point-to-point routing).
        </p>
      </header>

      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-xl border border-sky-500/20 bg-slate-900/40 p-4">
        <div>
          <label className="text-xs text-slate-500">Source</label>
          <select
            className="mt-1 block rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
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
          <label className="text-xs text-slate-500">Destination</label>
          <select
            className="mt-1 block rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          >
            {ids.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {loading && <LoadingSpinner label="Benchmarking algorithms…" />}
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {String(error)}
        </div>
      )}

      {chartCost && chartCost.length > 0 && (
        <div className="mb-10 h-80 rounded-xl border border-sky-500/15 bg-slate-950/50 p-4">
          <h2 className="mb-2 text-sm font-medium text-slate-300">Simulated cost (USD)</h2>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={chartCost}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #334155' }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Bar dataKey="cost" fill="#38bdf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {chartCost && (
        <div className="h-72 rounded-xl border border-sky-500/15 bg-slate-950/50 p-4">
          <h2 className="mb-2 text-sm font-medium text-slate-300">Execution time (ms)</h2>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={chartCost}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #334155' }}
              />
              <Bar dataKey="ms" fill="#a78bfa" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {data?.results && (
        <table className="mt-10 w-full overflow-hidden rounded-xl border border-slate-800 text-left text-sm">
          <thead className="bg-slate-900/80 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Algorithm</th>
              <th className="px-4 py-3">Cost</th>
              <th className="px-4 py-3">Time (ms)</th>
              <th className="px-4 py-3">Nodes explored</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {data.results.map((r) => (
              <tr key={r.algorithm} className="bg-slate-950/40">
                <td className="px-4 py-2 font-mono text-sky-200">{r.algorithm}</td>
                <td className="px-4 py-2">
                  {r.cost === Infinity ? '—' : r.cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
                <td className="px-4 py-2">{r.execution_time_ms.toFixed(4)}</td>
                <td className="px-4 py-2">{r.nodes_explored}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
