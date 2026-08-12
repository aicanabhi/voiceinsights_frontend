import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { listAnalysis } from '../api/analysis'
import { errorMessage } from '../api/client'
import { listMedia } from '../api/media'
import { formatDateTime, formatNumber } from '../lib/format'
import { SENTIMENT_COLORS } from '../lib/vizColors'

function SentimentPill({ value }) {
  if (!value) return <span className="muted">—</span>

  // Anything the model returned that is not one of the three buckets is kept
  // verbatim by the backend, so fall back to the "other" swatch rather than
  // dropping it.
  const color = SENTIMENT_COLORS[value] || SENTIMENT_COLORS.Other

  return (
    <span className="sentiment">
      <span className="swatch" style={{ background: color }} aria-hidden="true" />
      {value}
    </span>
  )
}

function ScoreCell({ value }) {
  if (value == null) return <span className="muted">—</span>

  return (
    <span className="score-cell">
      <span className="mini-meter">
        <span
          className="mini-meter-fill"
          style={{ width: `${Math.min(100, Math.max(0, value * 10))}%` }}
        />
      </span>
      {formatNumber(value)}
    </span>
  )
}

export default function AnalysisPage() {
  const [analyses, setAnalyses] = useState([])
  const [mediaById, setMediaById] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sentimentFilter, setSentimentFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      // AnalysisResponse carries only media_id, so the recordings are fetched
      // alongside to put a filename on each row. Both endpoints apply the same
      // role scope, so the two lists line up.
      const [rows, media] = await Promise.all([listAnalysis(), listMedia()])

      setAnalyses(rows)
      setMediaById(Object.fromEntries(media.map((item) => [item.id, item])))
    } catch (err) {
      setError(errorMessage(err, 'Could not load analyses.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const sentiments = useMemo(
    () => [...new Set(analyses.map((row) => row.sentiment).filter(Boolean))].sort(),
    [analyses],
  )

  const visible = useMemo(
    () =>
      sentimentFilter
        ? analyses.filter((row) => row.sentiment === sentimentFilter)
        : analyses,
    [analyses, sentimentFilter],
  )

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Analysis</h1>
          <p className="muted">Scores and sentiment for every analysed call you can see.</p>
        </div>

        <button type="button" className="btn" onClick={load}>
          Refresh
        </button>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      {sentiments.length > 1 && (
        <div className="filter-bar">
          <select
            value={sentimentFilter}
            onChange={(event) => setSentimentFilter(event.target.value)}
          >
            <option value="">All sentiment</option>
            {sentiments.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : visible.length === 0 ? (
          <div className="empty-state">
            <h2>No analyses</h2>
            <p className="muted">
              {analyses.length === 0
                ? 'Analysis is produced after a recording finishes transcribing.'
                : 'No analysis has that sentiment.'}
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Recording</th>
                  <th>Sentiment</th>
                  <th>Overall</th>
                  <th>Compliance</th>
                  <th>Professionalism</th>
                  <th>Empathy</th>
                  <th>Checks</th>
                  <th>Analysed</th>
                </tr>
              </thead>

              <tbody>
                {visible.map((row) => {
                  const media = mediaById[row.media_id]

                  return (
                    <tr key={row.id}>
                      <td className="strong">
                        <Link to={`/media/${row.media_id}`}>
                          {media?.original_filename || `Recording #${row.media_id}`}
                        </Link>
                        {row.summary && <div className="row-sub">{row.summary}</div>}
                      </td>
                      <td>
                        <SentimentPill value={row.sentiment} />
                      </td>
                      <td>
                        <ScoreCell value={row.overall_score} />
                      </td>
                      <td>
                        <ScoreCell value={row.compliance_score} />
                      </td>
                      <td>
                        <ScoreCell value={row.professionalism_score} />
                      </td>
                      <td>
                        <ScoreCell value={row.empathy_score} />
                      </td>
                      <td>
                        <span className={row.greeting_followed ? 'check ok' : 'check bad'}>
                          {row.greeting_followed ? '✓' : '✕'} Greeting
                        </span>{' '}
                        <span className={row.closing_followed ? 'check ok' : 'check bad'}>
                          {row.closing_followed ? '✓' : '✕'} Closing
                        </span>
                      </td>
                      <td>{formatDateTime(row.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
