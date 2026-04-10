/** User-facing message for failed API calls (Axios / network). */
export function formatApiError(error) {
  const detail = error?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map((d) => d.msg || JSON.stringify(d)).join('; ')
  }
  if (detail && typeof detail === 'object') return JSON.stringify(detail)

  const msg = error?.message || ''
  const code = error?.code
  if (
    code === 'ECONNREFUSED' ||
    code === 'ERR_NETWORK' ||
    /network error/i.test(msg) ||
    /ECONNREFUSED/i.test(msg)
  ) {
    return (
      'Cannot reach the API on port 8000. Open a second terminal, run: ' +
      'cd backend → uvicorn main:app --reload --host 127.0.0.1 --port 8000 ' +
      'and keep it running while you use the app (http://localhost:5173).'
    )
  }
  return msg || 'Request failed'
}
