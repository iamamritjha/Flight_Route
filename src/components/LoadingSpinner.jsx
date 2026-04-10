export default function LoadingSpinner({ label = 'Computing…' }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-sky-500/20 bg-sky-950/40 px-4 py-3 text-sm text-sky-100/90">
      <span
        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-sky-400/30 border-t-sky-400"
        aria-hidden
      />
      <span>{label}</span>
    </div>
  )
}
