import React, { useEffect, useMemo, useRef, useState } from 'react'
import Globe from 'react-globe.gl'
import * as THREE from 'three'

// Simple ATC colors
const COLORS = {
  globe: '#000000',     // Pitch black globe for ATC look
  ocean: '#0a0a0f',
  land: '#0f172a',      // Slate 900
  arcs: '#38bdf8',      // Sky blue
  activeArc: '#fbbf24', // Amber 400
  airport: '#10b981',   // Emerald 500
  noFly: '#ef4444',     // Red 500
  grid: '#1e293b'
}

export default function ATC3DGlobe({
  airports = [],
  routes = [],
  path = [],
  noFlyIds = [],
}) {
  const globeRef = useRef()
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const containerRef = useRef()
  const flightState = useRef({ active: false, pathNodes: [], startTime: 0, DURATION: 2000 })

  useEffect(() => {
    if (!containerRef.current) return
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        })
      }
    })
    resizeObserver.observe(containerRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  // Auto-rotate globe
  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.controls().autoRotate = true
      globeRef.current.controls().autoRotateSpeed = 0.5
      globeRef.current.controls().enableDamping = true
      globeRef.current.controls().dampingFactor = 0.05
      globeRef.current.pointOfView({ lat: 20, lng: 77, altitude: 1.5 }, 2000)
    }
  }, [])

  const blocked = useMemo(() => new Set(noFlyIds || []), [noFlyIds])
  const byId = useMemo(() => Object.fromEntries(airports.map((a) => [a.id, a])), [airports])

  const visibleAirports = useMemo(
    () => airports.filter((a) => !blocked.has(a.id)),
    [airports, blocked],
  )

  const networkArcs = useMemo(() => {
    const arcs = []
    for (const r of routes) {
      if (blocked.has(r.from) || blocked.has(r.to)) continue
      const a = byId[r.from]
      const b = byId[r.to]
      if (!a || !b) continue
      arcs.push({
        startLat: a.lat,
        startLng: a.lon,
        endLat: b.lat,
        endLng: b.lon,
        color: ['rgba(56,189,248,0.25)', 'rgba(56,189,248,0.05)'], // Faded blue
        isActive: false
      })
      // Add a reverse arc for ambient bidirectional flow
      arcs.push({
        startLat: b.lat,
        startLng: b.lon,
        endLat: a.lat,
        endLng: a.lon,
        color: ['rgba(56,189,248,0.05)', 'rgba(56,189,248,0.25)'],
        isActive: false
      })
    }
    return arcs
  }, [routes, byId, blocked])

  const activePathArcs = useMemo(() => {
    if (!path.length) return []
    const arcs = []
    for(let i=0; i<path.length-1; i++) {
        const a = byId[path[i]]
        const b = byId[path[i+1]]
        if(a && b) {
            arcs.push({
                startLat: a.lat,
                startLng: a.lon,
                endLat: b.lat,
                endLng: b.lon,
                color: [COLORS.activeArc, COLORS.activeArc],
                isActive: true
            })
        }
    }
    return arcs
  }, [path, byId])

  const allArcs = useMemo(() => [...networkArcs, ...activePathArcs], [networkArcs, activePathArcs])

  useEffect(() => {
    if (!path || path.length < 2) {
      flightState.current.active = false
      return
    }
    flightState.current.pathNodes = path.map(id => byId[id]).filter(Boolean)
    flightState.current.startTime = performance.now()
    flightState.current.active = true
  }, [path, byId])

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-[600px] rounded-xl overflow-hidden bg-black border border-slate-800 shadow-[0_0_40px_rgba(56,189,248,0.1)]"
    >
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-black to-black opacity-50"></div>
      
      {/* HUD Edge Graphics */}
      <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-slate-700 m-4 opacity-50 z-10 pointer-events-none"></div>
      <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-slate-700 m-4 opacity-50 z-10 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-slate-700 m-4 opacity-50 z-10 pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-slate-700 m-4 opacity-50 z-10 pointer-events-none"></div>
      
      {/* Top Left HUD Text */}
      <div className="absolute top-6 left-8 z-10 pointer-events-none flex flex-col gap-1">
        <span className="text-emerald-500 font-mono text-[10px] tracking-widest">SYS.ONLINE // RADAR V2.0</span>
        <span className="text-slate-500 font-mono text-[10px]">TRACKING {visibleAirports.length} NODES</span>
        <span className="text-slate-500 font-mono text-[10px]">ACTIVE ARCS: {allArcs.length}</span>
      </div>

      <div className="absolute inset-0 z-[5]">
        {dimensions.width > 0 && (
          <Globe
            ref={globeRef}
            width={dimensions.width}
            height={dimensions.height}
            backgroundColor="rgba(0,0,0,0)"
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
            showAtmosphere={true}
            atmosphereColor={COLORS.arcs}
            atmosphereAltitude={0.15}
            
            // HTML Labels for crispness
            htmlElementsData={visibleAirports}
            htmlLat={d => d.lat}
            htmlLng={d => d.lon}
            htmlAltitude={0.01}
            htmlElement={d => {
              const el = document.createElement('div');
              const isActive = path.includes(d.id);
              el.innerHTML = `
                <div style="
                  color: ${isActive ? COLORS.activeArc : '#94a3b8'};
                  background: ${isActive ? 'rgba(15,23,42,0.8)' : 'transparent'};
                  padding: ${isActive ? '2px 4px' : '0'};
                  border-radius: 4px;
                  font-family: monospace;
                  font-size: ${isActive ? '14px' : '10px'};
                  font-weight: ${isActive ? 'bold' : 'normal'};
                  text-shadow: 0 0 4px rgba(0,0,0,0.8);
                  pointer-events: none;
                  white-space: nowrap;
                  transform: translate(-50%, -100%);
                  margin-top: -5px;
                ">
                  ${d.id} <span style="font-size: 8px; opacity: 0.6">${d.city.substring(0,6)}</span>
                </div>
                <div style="
                  width: ${isActive ? '8px' : '4px'};
                  height: ${isActive ? '8px' : '4px'};
                  background-color: ${isActive ? COLORS.activeArc : COLORS.airport};
                  border-radius: 50%;
                  transform: translate(-50%, -50%);
                  position: absolute;
                  top: 0; left: 0;
                "></div>
              `;
              return el;
            }}
            
            // Render ARCS
            arcsData={allArcs}
            arcLabel={d => d.isActive ? "Active Computed Path" : "Network Edge"}
            arcStartLat={d => d.startLat}
            arcStartLng={d => d.startLng}
            arcEndLat={d => d.endLat}
            arcEndLng={d => d.endLng}
            arcColor={d => d.color}
            arcDashLength={d => d.isActive ? 0.4 : 0.2}
            arcDashGap={d => d.isActive ? 0.05 : 1}
            arcDashAnimateTime={d => d.isActive ? 1500 : 4000}
            arcStroke={d => d.isActive ? 1.5 : 0.3}
            arcAltitudeAutoScale={d => d.isActive ? 0.35 : 0.15}
            
            // Hyper-performant 3D Airplane using customLayer outside React state tree
            customLayerData={[1]}
            customThreeObject={() => {
              // Creating a glowing supersonic jet model
              const geometry = new THREE.ConeGeometry(0.8, 3, 4);
              geometry.rotateX(Math.PI / 2); // Point curve towards forward travel
              const material = new THREE.MeshBasicMaterial({ color: '#fbbf24' });
              return new THREE.Mesh(geometry, material);
            }}
            customThreeObjectUpdate={(obj) => {
              const state = flightState.current;
              if (!state.active || state.pathNodes.length < 2) {
                obj.visible = false;
                return;
              }
              obj.visible = true;
              
              const elapsed = performance.now() - state.startTime;
              const totalDuration = (state.pathNodes.length - 1) * state.DURATION;
              const currentElapsed = elapsed % totalDuration;
              const legIndex = Math.floor(currentElapsed / state.DURATION);
              const t = (currentElapsed % state.DURATION) / state.DURATION;

              const A = state.pathNodes[legIndex];
              const B = state.pathNodes[legIndex + 1];

              if (A && B && globeRef.current) {
                const lat = A.lat + (B.lat - A.lat) * t;
                let lonDelta = B.lon - A.lon;
                if (lonDelta > 180) lonDelta -= 360;
                if (lonDelta < -180) lonDelta += 360;
                const lon = A.lon + lonDelta * t;
                const alt = 0.01 + 4 * 0.35 * t * (1 - t);
                
                const coords = globeRef.current.getCoords(lat, lon, alt);
                obj.position.set(coords.x, coords.y, coords.z);
                
                // Banking LookAt vector
                const nextT = Math.min(1.0, t + 0.01);
                const nextLat = A.lat + (B.lat - A.lat) * nextT;
                const nextLon = A.lon + lonDelta * nextT;
                const nextAlt = 0.01 + 4 * 0.35 * nextT * (1 - nextT);
                const nextCoords = globeRef.current.getCoords(nextLat, nextLon, nextAlt);
                obj.lookAt(nextCoords.x, nextCoords.y, nextCoords.z);
              }
            }}
          />
        )}
      </div>

      <p className="absolute bottom-6 w-full text-center text-slate-600 font-mono text-[10px] tracking-widest z-10 pointer-events-none">
        INTERACTIVE 3D GLOBE · <span className="text-emerald-500/70">ALL SYSTEMS NOMINAL</span>
      </p>
    </div>
  )
}
