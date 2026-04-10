import axios from 'axios'

const baseURL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? '/api' : 'http://127.0.0.1:8000')

export const api = axios.create({
  baseURL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

export async function fetchAirports(dataset = 'india') {
  const { data } = await api.get('/airports', { params: { dataset } })
  return data.airports
}

export async function fetchRoutes(dataset = 'india') {
  const { data } = await api.get('/routes', { params: { dataset } })
  return data.routes
}

export async function runAlgorithm(payload) {
  const { data } = await api.post('/run-algorithm', payload)
  return data
}

export async function compare(params) {
  const { data } = await api.get('/compare', { params })
  return data
}

export async function generateScenario(body, dataset = 'india') {
  const { data } = await api.post('/scenario', body, { params: { dataset } })
  return data
}

export async function fetchSuggestion(params) {
  const { data } = await api.get('/suggest', { params })
  return data
}

export async function fetchWeatherAirport(airportId, dataset = 'india') {
  const { data } = await api.get('/weather', { params: { airport_id: airportId, dataset } })
  return data
}

export async function fetchMeta(dataset = 'india') {
  const { data } = await api.get('/meta', { params: { dataset } })
  return data
}
