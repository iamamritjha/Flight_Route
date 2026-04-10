import { useCallback, useMemo } from 'react'
import ForceGraph2D from 'react-force-graph-2d'

function projectLatLon(lat, lon) {
  const x = (lon + 125) * 14
  const y = (50 - lat) * 14
  return { x, y }
}

export default function FlightGraph({
  airports = [],
  routes = [],
  path = [],
  highlightIndex = 0,
  noFlyIds = [],
}) {
  const blocked = useMemo(() => new Set(noFlyIds || []), [noFlyIds])

  const graphData = useMemo(() => {
    const nodes = airports
      .filter((a) => !blocked.has(a.id))
      .map((a) => {
        const p = projectLatLon(a.lat, a.lon)
        return {
          id: a.id,
          name: a.id,
          city: a.city,
          x: p.x,
          y: p.y,
          fx: p.x,
          fy: p.y,
        }
      })

    const idSet = new Set(nodes.map((n) => n.id))

    const links = routes
      .filter((r) => idSet.has(r.from) && idSet.has(r.to))
      .map((r) => ({ source: r.from, target: r.to }))

    return { nodes, links }
  }, [airports, routes, blocked])

  const pathSet = useMemo(() => new Set(path), [path])

  const activeId =
    path.length > 0
      ? path[Math.min(highlightIndex, path.length - 1)]
      : null

  const paintNode = useCallback(
    (node, ctx) => {
      const isOnPath = pathSet.has(node.id)
      const isActive = activeId === node.id

      const r = isActive ? 6 : isOnPath ? 5 : 3.5

      ctx.beginPath()
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false)

      ctx.fillStyle = isActive
        ? '#fbbf24'
        : isOnPath
        ? '#38bdf8'
        : 'rgba(148,163,184,0.6)'

      ctx.fill()

      ctx.lineWidth = isActive ? 2 : 1
      ctx.strokeStyle = 'rgba(15,23,42,0.9)'
      ctx.stroke()

      ctx.font = '10px DM Sans, sans-serif'
      ctx.fillStyle = 'rgba(226,232,240,0.95)'
      ctx.fillText(node.id, node.x + 8, node.y + 3)
    },
    [pathSet, activeId]
  )

  const paintLink = useCallback(
    (link, ctx) => {
      const a = link.source.id ?? link.source
      const b = link.target.id ?? link.target
      const pair = [a, b].sort().join('-')

      let onPath = false
      for (let i = 0; i < path.length - 1; i++) {
        const p = [path[i], path[i + 1]].sort().join('-')
        if (p === pair) {
          onPath = true
          break
        }
      }

      const start = link.source
      const end = link.target

      ctx.beginPath()
      ctx.moveTo(start.x, start.y)
      ctx.lineTo(end.x, end.y)

      ctx.strokeStyle = onPath
        ? 'rgba(56,189,248,0.85)'
        : 'rgba(71,85,105,0.35)'

      ctx.lineWidth = onPath ? 2.5 : 1
      ctx.stroke()
    },
    [path]
  )

  return (
    <div className="h-105 w-full overflow-hidden rounded-xl border border-sky-500/15 bg-slate-950/60">
      <ForceGraph2D
        graphData={graphData}
        nodeId="id"
        nodeRelSize={4}
        backgroundColor="rgba(2,6,23,0)"
        enablePointerInteraction
        enableZoomInteraction
        cooldownTicks={0}
        d3AlphaDecay={0}
        d3VelocityDecay={0}
        nodeCanvasObject={paintNode}
        nodePointerAreaPaint={(node, color, ctx) => {
          ctx.beginPath()
          ctx.arc(node.x, node.y, 10, 0, 2 * Math.PI, false)
          ctx.fillStyle = color
          ctx.fill()
        }}
        linkCanvasObject={paintLink}
      />
    </div>
  )
}