export function formatBytes(bytes) {
  if (bytes == null) return '—'
  if (bytes < 1024) return `${bytes} B`

  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`
}

/** Seconds to m:ss, for timestamps on transcript segments. */
export function formatDuration(seconds) {
  if (seconds == null || Number.isNaN(seconds)) return '—'

  const total = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(total / 60)

  return `${minutes}:${String(total % 60).padStart(2, '0')}`
}

export function formatDateTime(value) {
  if (!value) return '—'

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

export function formatNumber(value, digits = 1) {
  if (value == null || Number.isNaN(value)) return '—'
  return Number(value).toFixed(digits)
}

export function formatPercent(value, digits = 0) {
  if (value == null || Number.isNaN(value)) return '—'
  return `${Number(value).toFixed(digits)}%`
}
