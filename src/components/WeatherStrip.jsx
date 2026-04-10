import { useEffect, useState } from 'react'
import { fetchWeatherAirport } from '../services/api'
import { formatApiError } from '../utils/apiError'

export default function WeatherStrip({ originId, destId }) {
  const [a, setA] = useState(null)
  const [b, setB] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    if (!originId || !destId) return
    let cancelled = false
    setErr(null)
    Promise.all([fetchWeatherAirport(originId), fetchWeatherAirport(destId)])
      .then(([wa, wb]) => {
        if (!cancelled) {
          setA(wa)
          setB(wb)
        }
      })
      .catch((e) => {
        if (!cancelled) setErr(formatApiError(e))
      })
    return () => {
      cancelled = true
    }
  }, [originId, destId])

  const card = (label, id, w) => (
    <div className="min-w-[140px] flex-1 rounded-lg border border-sky-500/20 bg-slate-950/70 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-300/90">
        {label} · {id}
      </p>
      {w ? (
        <dl className="mt-1 space-y-0.5 text-[11px] text-slate-200">
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">Sky</dt>
            <dd>{w.conditions}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">Temp</dt>
            <dd>{w.temperature_c != null ? `${Math.round(w.temperature_c)}°C` : '—'}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">Wind</dt>
            <dd>
              {w.wind_speed_kmh != null ? `${Math.round(w.wind_speed_kmh)} km/h` : '—'}
              {w.wind_direction_deg != null ? ` @ ${Math.round(w.wind_direction_deg)}°` : ''}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="mt-1 text-[11px] text-slate-500">Loading…</p>
      )}
    </div>
  )

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {card('Origin', originId, a)}
        {card('Destination', destId, b)}
      </div>
      {err && <p className="text-[11px] text-amber-200/90">{err}</p>}
      <p className="text-[10px] text-slate-600">Live conditions via Open-Meteo (approximate airport location).</p>
    </div>
  )
}
