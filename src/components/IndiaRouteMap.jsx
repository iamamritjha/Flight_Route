import L from 'leaflet'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CircleMarker,
  MapContainer,
  Marker,
  Pane,
  Polyline,
  ScaleControl,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import { interpolateAlongPath } from '../utils/geo'

const ZOOM_SHOW_CODE = 6
const ZOOM_SHOW_FULL = 8

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function airportLabelIcon(a, level) {
  const full = level === 'full'
  const html = full
    ? `<div class="airport-label-wrap">
         <div class="airport-label-chip airport-label-chip--full">
           <span class="airport-label-iata">${a.id}</span>
           <span class="airport-label-city">${escapeHtml(a.city || '')}</span>
           ${a.country ? `<span class="airport-label-cc">${escapeHtml(a.country)}</span>` : ''}
         </div>
       </div>`
    : `<div class="airport-label-wrap">
         <div class="airport-label-chip"><span class="airport-label-iata">${a.id}</span></div>
       </div>`

  return L.divIcon({
    className: 'airport-label-outer',
    html,
    iconSize: [1, 1],
    iconAnchor: [0, 0],
  })
}

function FitBoundsAnimated({ points, signature }) {
  const map = useMap()
  useEffect(() => {
    if (!points?.length) return
    if (points.length === 1) {
      map.flyTo(points[0], Math.max(map.getZoom(), 7), { duration: 1.1 })
      return
    }
    const b = L.latLngBounds(points)
    map.flyToBounds(b, { padding: [48, 48], maxZoom: 7, duration: 1.25 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, signature])
  return null
}

function ZoomLevelAirportLabels({ visibleAirports, path }) {
  const map = useMap()
  const [zoom, setZoom] = useState(() => map.getZoom())

  useMapEvents({
    zoom: () => setZoom(map.getZoom()),
    zoomend: () => setZoom(map.getZoom()),
  })

  useEffect(() => {
    setZoom(map.getZoom())
  }, [map])

  const labelLevel = zoom >= ZOOM_SHOW_FULL ? 'full' : zoom >= ZOOM_SHOW_CODE ? 'code' : null
  if (!labelLevel) return null

  const pathSet = new Set(path || [])
  const iconLevel = labelLevel === 'full' ? 'full' : 'short'

  return (
    <Pane name="airport-labels" style={{ zIndex: 650 }}>
      {visibleAirports.map((a) => {
        const emphasise = pathSet.has(a.id)
        return (
          <Marker
            key={`lbl-${a.id}-${labelLevel}`}
            position={[a.lat, a.lon]}
            icon={airportLabelIcon(a, iconLevel)}
            opacity={emphasise ? 1 : 0.9}
            interactive={false}
          />
        )
      })}
    </Pane>
  )
}

function AnimatedRoutePolyline({ pathLine, routeKey }) {
  const [phase, setPhase] = useState(1)
  useEffect(() => {
    if (pathLine.length < 2) {
      setPhase(1)
      return
    }
    setPhase(0)
    const t0 = performance.now()
    const dur = 1400
    let id
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur)
      setPhase(p)
      if (p < 1) id = requestAnimationFrame(step)
    }
    id = requestAnimationFrame(step)
    return () => cancelAnimationFrame(id)
  }, [routeKey, pathLine.length])

  const n = pathLine.length
  const k =
    n < 2 ? 0 : Math.max(2, Math.min(n, Math.round(1 + phase * Math.max(1, n - 1))))
  const partial = pathLine.slice(0, k)

  if (partial.length < 2) return null

  return (
    <>
      <Polyline
        positions={partial}
        pathOptions={{
          color: 'rgba(56,189,248,0.35)',
          weight: 8,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
      <Polyline
        positions={partial}
        pathOptions={{
          color: '#38bdf8',
          weight: 3,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
    </>
  )
}

function planeDivIcon(deg) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36" aria-hidden="true">
    <path fill="#fbbf24" stroke="#0f172a" stroke-width="0.55"
      d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
  </svg>`
  return L.divIcon({
    className: 'plane-marker',
    html: `<div class="plane-float"><div class="plane-marker-inner" style="transform:rotate(${deg}deg)">${svg}</div></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  })
}

function SmoothAircraft({ pathLine, routeKey, active }) {
  const [t, setT] = useState(0)
  const startRef = useRef(null)

  useEffect(() => {
    if (!active || pathLine.length < 2) {
      setT(0)
      return
    }
    startRef.current = performance.now()
    let id
    const loopMs = 11000
    const tick = (now) => {
      const base = startRef.current || now
      setT(((now - base) % loopMs) / loopMs)
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [active, routeKey, pathLine.length])

  if (!active || pathLine.length < 2) return null
  const pos = interpolateAlongPath(pathLine, t)
  if (!pos) return null

  return <Marker position={[pos.lat, pos.lon]} icon={planeDivIcon(pos.bear)} zIndexOffset={800} />
}

function MapReadyClass() {
  const map = useMap()
  useEffect(() => {
    const el = map.getContainer()
    el.classList.add('skyroute-map-ready')
    return () => el.classList.remove('skyroute-map-ready')
  }, [map])
  return null
}

function AmbientAircraft({ pathLine, startOffset, durationMs }) {
  const [t, setT] = useState(0)
  const startRef = useRef(null)

  useEffect(() => {
    startRef.current = performance.now()
    let id
    const tick = (now) => {
      const base = startRef.current || now
      const elapsed = now - base
      const currentProgress = (elapsed / durationMs) + startOffset
      setT(currentProgress % 1)
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [durationMs, startOffset])

  const pos = interpolateAlongPath(pathLine, t)
  if (!pos) return null

  const icon = L.divIcon({
    className: 'ambient-plane-marker',
    html: `<div style="transform:rotate(${pos.bear}deg); opacity: 0.5; width: 20px; height: 20px; margin-left: -10px; margin-top: -10px; pointer-events: none;">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#94a3b8" stroke="#334155" stroke-width="1">
        <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
      </svg>
    </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  })

  return <Marker position={[pos.lat, pos.lon]} icon={icon} zIndexOffset={400} interactive={false} />
}

function AmbientAirTraffic({ networkLines }) {
  const planes = useMemo(() => {
    if (!networkLines || networkLines.length === 0) return []
    const planesArray = []
    const numPlanes = Math.min(45, networkLines.length * 2)
    for (let i = 0; i < numPlanes; i++) {
      const lineIdx = i % networkLines.length
      const line = networkLines[lineIdx]
      const pathLine = i % 2 === 0 ? line : [line[1], line[0]]
      planesArray.push({
        id: `ambient-${i}`,
        pathLine,
        startOffset: (i * 0.137) % 1,
        durationMs: 18000 + ((i * 347) % 12000)
      })
    }
    return planesArray
  }, [networkLines])

  return (
    <Pane name="ambient-traffic" style={{ zIndex: 450 }}>
      {planes.map(p => (
        <AmbientAircraft 
          key={p.id} 
          pathLine={p.pathLine} 
          startOffset={p.startOffset} 
          durationMs={p.durationMs} 
        />
      ))}
    </Pane>
  )
}

export default function IndiaRouteMap({
  airports = [],
  routes = [],
  path = [],
  noFlyIds = [],
}) {
  const blocked = useMemo(() => new Set(noFlyIds || []), [noFlyIds])
  const byId = useMemo(() => Object.fromEntries(airports.map((a) => [a.id, a])), [airports])

  const visibleAirports = useMemo(
    () => airports.filter((a) => !blocked.has(a.id)),
    [airports, blocked],
  )

  const networkLines = useMemo(() => {
    const lines = []
    for (const r of routes) {
      if (blocked.has(r.from) || blocked.has(r.to)) continue
      const a = byId[r.from]
      const b = byId[r.to]
      if (!a || !b) continue
      lines.push([
        [a.lat, a.lon],
        [b.lat, b.lon],
      ])
    }
    return lines
  }, [routes, byId, blocked])

  const pathLine = useMemo(() => {
    if (!path.length) return []
    return path
      .map((id) => {
        const a = byId[id]
        return a ? [a.lat, a.lon] : null
      })
      .filter(Boolean)
  }, [path, byId])

  const fitPoints = useMemo(() => {
    if (pathLine.length) return pathLine
    return visibleAirports.map((a) => [a.lat, a.lon])
  }, [pathLine, visibleAirports])

  const routeKey = path.length ? path.join('→') : 'network'
  const center = [22.5, 78]
  const pathSet = useMemo(() => new Set(path), [path])

  return (
    <div className="skyroute-map-shell group/map relative h-[480px] w-full overflow-hidden rounded-xl border border-sky-500/20 bg-slate-950/80 [&_.leaflet-container]:z-0 [&_.leaflet-control]:text-slate-800">
      <MapContainer
        center={center}
        zoom={5}
        minZoom={4}
        maxZoom={11}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
        className="rounded-xl skyroute-leaflet"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
        <ScaleControl position="bottomleft" metric imperial={false} />
        <MapReadyClass />
        <FitBoundsAnimated points={fitPoints} signature={routeKey} />

        {networkLines.map((positions, idx) => (
          <Polyline
            key={`e-${idx}`}
            positions={positions}
            pathOptions={{
              color: 'rgba(148,163,184,0.18)',
              weight: 1,
            }}
          />
        ))}

        {pathLine.length > 1 && (
          <AnimatedRoutePolyline pathLine={pathLine} routeKey={routeKey} />
        )}

        <Pane name="markers" style={{ zIndex: 600 }}>
          {visibleAirports.map((a) => {
            const onPath = pathSet.has(a.id)
            const isEnd = path.length > 0 && (a.id === path[0] || a.id === path[path.length - 1])
            return (
              <CircleMarker
                key={a.id}
                center={[a.lat, a.lon]}
                radius={onPath ? (isEnd ? 8 : 6) : 3.5}
                pathOptions={{
                  color: '#0f172a',
                  weight: isEnd ? 2 : 1,
                  fillColor: onPath ? (isEnd ? '#fbbf24' : '#38bdf8') : 'rgba(148,163,184,0.8)',
                  fillOpacity: 0.95,
                }}
              >
                <Tooltip
                  direction="top"
                  offset={[0, -6]}
                  opacity={1}
                  className="skyroute-airport-tooltip"
                >
                  <div className="text-left">
                    <div className="font-bold tracking-wide text-sky-200">{a.id}</div>
                    <div className="text-slate-200">{a.name}</div>
                    <div className="text-[11px] text-slate-400">
                      {a.city}
                      {a.country ? ` · ${a.country}` : ''}
                    </div>
                    {a.region && (
                      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-500">
                        {a.region}
                      </div>
                    )}
                    <div className="mt-1 font-mono text-[10px] text-slate-500">
                      {a.lat.toFixed(3)}°, {a.lon.toFixed(3)}°
                    </div>
                  </div>
                </Tooltip>
              </CircleMarker>
            )
          })}
        </Pane>

        <ZoomLevelAirportLabels visibleAirports={visibleAirports} path={path} />

        <AmbientAirTraffic networkLines={networkLines} />

        <SmoothAircraft
          pathLine={pathLine}
          routeKey={routeKey}
          active={pathLine.length >= 2}
        />
      </MapContainer>
      <div className="map-chrome-hint pointer-events-none absolute inset-x-0 bottom-14 z-[1000] mx-auto flex justify-center opacity-0 transition duration-500 group-hover/map:opacity-100">
        <span className="rounded-full border border-white/10 bg-slate-950/85 px-3 py-1 text-[10px] text-slate-300 shadow-lg backdrop-blur-sm">
          Zoom to <strong className="text-sky-300">{ZOOM_SHOW_CODE}+</strong> for codes ·{' '}
          <strong className="text-sky-300">{ZOOM_SHOW_FULL}+</strong> for city &amp; country
        </span>
      </div>
      <p className="mt-2 text-center text-[10px] text-slate-500">
        Satellite (Esri) · hover an airport for full details · ambient traffic simulated
      </p>
    </div>
  )
}
