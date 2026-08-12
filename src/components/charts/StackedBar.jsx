/**
 * One horizontal stacked bar with a legend.
 *
 * Used for sentiment, which is a polarity split rather than a set of unrelated
 * categories, so it takes the diverging pair (blue positive / red negative)
 * with a neutral grey between. Segments carry a 2px surface gap so adjacent
 * fills never touch, and every segment is named in the legend with its count --
 * identity is never colour alone.
 */
export default function StackedBar({ segments, emptyLabel = 'No data yet.' }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)

  if (total === 0) {
    return <p className="muted">{emptyLabel}</p>
  }

  const present = segments.filter((segment) => segment.value > 0)

  return (
    <div className="stacked">
      <div className="stacked-track">
        {present.map((segment) => (
          <div
            key={segment.label}
            className="stacked-segment"
            style={{
              width: `${(segment.value / total) * 100}%`,
              background: segment.color,
            }}
            title={`${segment.label}: ${segment.value}`}
          />
        ))}
      </div>

      <ul className="legend">
        {segments.map((segment) => (
          <li key={segment.label}>
            <span className="swatch" style={{ background: segment.color }} aria-hidden="true" />
            <span>{segment.label}</span>
            <strong>{segment.value}</strong>
            <span className="muted">
              {total > 0 ? `${Math.round((segment.value / total) * 100)}%` : '—'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
