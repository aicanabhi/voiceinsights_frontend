/**
 * A labelled horizontal bar per row.
 *
 * Deliberately not a stacked bar. The call statuses need "completed" green
 * beside "failed" red, and that pair separates by only ΔE 4.1 under deuteranopia
 * -- as adjacent segments in one bar it would be unreadable. As one labelled row
 * per value, the name and the count carry the meaning and colour is a redundant
 * cue, which is the rule for status colour everywhere.
 */
export default function BarRows({ rows, total }) {
  const max = total ?? Math.max(...rows.map((row) => row.value), 1)

  return (
    <div className="bar-rows">
      {rows.map((row) => {
        const share = max > 0 ? (row.value / max) * 100 : 0

        return (
          <div className="bar-row" key={row.label}>
            <div className="bar-row-head">
              <span className="bar-row-label">
                <span className="swatch" style={{ background: row.color }} aria-hidden="true" />
                {row.label}
              </span>
              <span className="bar-row-value">{row.value}</span>
            </div>

            <div className="bar-track">
              <div
                className="bar-fill"
                style={{ width: `${share}%`, background: row.color }}
                role="img"
                aria-label={`${row.label}: ${row.value}`}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
