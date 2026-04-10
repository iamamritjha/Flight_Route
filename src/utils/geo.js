/** Initial bearing from (lat1,lon1) to (lat2,lon2), degrees clockwise from north. */
export function bearingDeg(lat1, lon1, lat2, lon2) {
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  const θ = Math.atan2(y, x)
  return ((θ * 180) / Math.PI + 360) % 360
}

const R_KM = 6371

/** Great-circle distance in km (for proportional movement along a polyline). */
export function haversineKm(lat1, lon1, lat2, lon2) {
  const p1 = (lat1 * Math.PI) / 180
  const p2 = (lat2 * Math.PI) / 180
  const dφ = ((lat2 - lat1) * Math.PI) / 180
  const dλ = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dφ / 2) * Math.sin(dφ / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dλ / 2) * Math.sin(dλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R_KM * c
}

/**
 * @param {Array<[number, number]>} coords [lat, lon][]
 * @param {number} t 0..1 along total path length
 */
export function interpolateAlongPath(coords, t) {
  if (!coords || coords.length < 2) return null
  const segLens = []
  let total = 0
  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i]
    const b = coords[i + 1]
    const d = haversineKm(a[0], a[1], b[0], b[1])
    segLens.push(d)
    total += d
  }
  if (total < 1e-6) {
    const a = coords[0]
    return { lat: a[0], lon: a[1], bear: 0 }
  }
  let dist = (((t % 1) + 1) % 1) * total
  for (let i = 0; i < segLens.length; i++) {
    const d = segLens[i]
    const a = coords[i]
    const b = coords[i + 1]
    if (dist <= d || i === segLens.length - 1) {
      const fr = d < 1e-9 ? 0 : Math.min(1, Math.max(0, dist / d))
      return {
        lat: a[0] + fr * (b[0] - a[0]),
        lon: a[1] + fr * (b[1] - a[1]),
        bear: bearingDeg(a[0], a[1], b[0], b[1]),
      }
    }
    dist -= d
  }
  const last = coords[coords.length - 1]
  return { lat: last[0], lon: last[1], bear: 0 }
}
