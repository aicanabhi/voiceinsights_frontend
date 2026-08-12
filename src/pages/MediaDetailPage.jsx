import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { generateAnalysis } from '../api/analysis'
import { errorMessage } from '../api/client'
import { IN_FLIGHT_STATUSES, MEDIA_STATUS, getCallResult } from '../api/media'
import AudioPlayer from '../components/AudioPlayer'
import StatusPill from '../components/StatusPill'
import {
  formatBytes,
  formatDateTime,
  formatDuration,
  formatNumber,
  formatPercent,
} from '../lib/format'

const POLL_MS = 5000

function Stat({ label, value }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  )
}

function Score({ label, value }) {
  const score = value == null ? null : Number(value)

  return (
    <div className="score">
      <div className="score-head">
        <span>{label}</span>
        <strong>{score == null ? '—' : formatNumber(score)}</strong>
      </div>

      <div className="meter">
        <div
          className="meter-fill"
          style={{ width: score == null ? 0 : `${Math.min(100, Math.max(0, score * 10))}%` }}
        />
      </div>
    </div>
  )
}

export default function MediaDetailPage() {
  const { id } = useParams()
  const audioRef = useRef(null)

  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentTime, setCurrentTime] = useState(0)
  const [analysing, setAnalysing] = useState(false)
  const [analysisError, setAnalysisError] = useState('')

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true)

      try {
        setResult(await getCallResult(id))
        if (!silent) setError('')
      } catch (err) {
        if (!silent) setError(errorMessage(err, 'Could not load this recording.'))
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [id],
  )

  useEffect(() => {
    load()
  }, [load])

  const status = result?.media?.status
  const inFlight = status ? IN_FLIGHT_STATUSES.includes(status) : false

  // transcript and analysis are null until the worker finishes, so the same
  // endpoint doubles as the poll target.
  useEffect(() => {
    if (!inFlight) return undefined

    const timer = setInterval(() => load({ silent: true }), POLL_MS)
    return () => clearInterval(timer)
  }, [inFlight, load])

  // Follow playback so the active segment can be highlighted.
  useEffect(() => {
    const element = audioRef.current
    if (!element) return undefined

    const onTimeUpdate = () => setCurrentTime(element.currentTime)

    element.addEventListener('timeupdate', onTimeUpdate)
    return () => element.removeEventListener('timeupdate', onTimeUpdate)
  }, [result])

  const runAnalysis = async () => {
    setAnalysing(true)
    setAnalysisError('')

    try {
      await generateAnalysis(id)
      await load({ silent: true })
    } catch (err) {
      setAnalysisError(errorMessage(err, 'Could not generate the analysis.'))
    } finally {
      setAnalysing(false)
    }
  }

  const seekTo = (seconds) => {
    const element = audioRef.current
    if (!element || seconds == null) return

    element.currentTime = seconds
    element.play().catch(() => {
      // Autoplay can be blocked; seeking still worked, so ignore it.
    })
  }

  if (loading) {
    return <div className="page">Loading…</div>
  }

  if (error) {
    return (
      <div className="page">
        <div className="alert alert-error">{error}</div>
        <Link className="btn" to="/media">
          Back to recordings
        </Link>
      </div>
    )
  }

  const { media, transcript, segments, analysis, metrics, has_diarization: hasDiarization } =
    result

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <Link className="back-link" to="/media">
            ← Recordings
          </Link>
          <h1>{media.original_filename}</h1>
          <p className="muted">
            <StatusPill status={media.status} /> · {media.provider} · {media.model} ·{' '}
            {media.language} · {formatBytes(media.file_size)} ·{' '}
            {formatDateTime(media.created_at)}
          </p>
        </div>

        <button type="button" className="btn" onClick={() => load()}>
          Refresh
        </button>
      </header>

      {media.status === MEDIA_STATUS.FAILED && media.error_message && (
        <div className="alert alert-error">
          Failed after {media.attempts} attempt(s): {media.error_message}
        </div>
      )}

      {inFlight && (
        <div className="alert alert-info">
          Transcription is {media.status.toLowerCase()}. This page refreshes on its own.
        </div>
      )}

      <div className="card section">
        <h2>Audio</h2>
        <AudioPlayer mediaId={media.id} audioRef={audioRef} />
      </div>

      {metrics && (
        <div className="card section">
          <h2>Call metrics</h2>

          <div className="stat-grid">
            <Stat label="Duration" value={formatDuration(metrics.duration_seconds)} />
            <Stat label="Speech" value={formatDuration(metrics.speech_seconds)} />
            <Stat label="Silence" value={formatDuration(metrics.silence_seconds)} />
            <Stat label="Turns" value={metrics.turns} />
            <Stat label="Segments" value={metrics.segments} />
            <Stat label="Interruptions" value={metrics.interruptions} />
            <Stat
              label="Avg response"
              value={
                metrics.avg_response_latency_seconds == null
                  ? '—'
                  : `${formatNumber(metrics.avg_response_latency_seconds)}s`
              }
            />
            <Stat
              label="Avg confidence"
              value={
                metrics.average_confidence == null
                  ? '—'
                  : formatPercent(metrics.average_confidence * 100)
              }
            />
          </div>

          {metrics.speakers?.length > 0 && (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Speaker</th>
                    <th>Talk time</th>
                    <th>Share</th>
                    <th>Words</th>
                    <th>WPM</th>
                    <th>Longest turn</th>
                  </tr>
                </thead>

                <tbody>
                  {metrics.speakers.map((speaker) => (
                    <tr key={speaker.speaker}>
                      <td className="strong">Speaker {speaker.speaker}</td>
                      <td>{formatDuration(speaker.talk_seconds)}</td>
                      <td>{formatPercent(speaker.talk_percent)}</td>
                      <td>{speaker.words}</td>
                      <td>{formatNumber(speaker.words_per_minute, 0)}</td>
                      <td>{formatDuration(speaker.longest_turn_seconds)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* A transcript with no analysis is a normal resting state -- the worker
          may have stopped at TRANSCRIBED, or analysis may have failed. Offer to
          run it rather than leaving the section blank. */}
      {!analysis && transcript && (
        <div className="card section">
          <h2>Analysis</h2>

          {analysisError && <div className="alert alert-error">{analysisError}</div>}

          <p className="muted">
            This call is transcribed but has no analysis yet.
          </p>

          <div>
            <button type="button" className="btn btn-primary" onClick={runAnalysis} disabled={analysing}>
              {analysing ? 'Analysing…' : 'Generate analysis'}
            </button>
          </div>
        </div>
      )}

      {analysis && (
        <div className="card section">
          {/* No re-analyse action here on purpose. generate/{media_id} always
              INSERTs -- there is no unique constraint on analysis.media_id and
              the previous row is not removed -- while get_call_result reads it
              back with scalar_one_or_none(). A second analysis therefore makes
              this endpoint raise MultipleResultsFound and 500 for good. Put the
              button back once the backend replaces instead of appending. */}
          <h2>Analysis</h2>

          {analysis.sentiment && (
            <p>
              <span className="muted">Sentiment: </span>
              <span className="pill pill-info">{analysis.sentiment}</span>
            </p>
          )}

          <div className="score-grid">
            <Score label="Overall" value={analysis.overall_score} />
            <Score label="Compliance" value={analysis.compliance_score} />
            <Score label="Professionalism" value={analysis.professionalism_score} />
            <Score label="Empathy" value={analysis.empathy_score} />
          </div>

          <div className="checks">
            <span className={analysis.greeting_followed ? 'check ok' : 'check bad'}>
              {analysis.greeting_followed ? '✓' : '✕'} Greeting
            </span>
            <span className={analysis.closing_followed ? 'check ok' : 'check bad'}>
              {analysis.closing_followed ? '✓' : '✕'} Closing
            </span>
          </div>

          {analysis.summary && (
            <section>
              <h3>Summary</h3>
              <p className="prose">{analysis.summary}</p>
            </section>
          )}

          {analysis.violations && (
            <section>
              <h3>Violations</h3>
              <p className="prose">{analysis.violations}</p>
            </section>
          )}

          {analysis.recommendations && (
            <section>
              <h3>Recommendations</h3>
              <p className="prose">{analysis.recommendations}</p>
            </section>
          )}

          {analysis.ai_feedback && (
            <section>
              <h3>Feedback</h3>
              <p className="prose">{analysis.ai_feedback}</p>
            </section>
          )}
        </div>
      )}

      <div className="card section">
        <h2>
          Transcript
          {hasDiarization && <span className="tag">diarized</span>}
        </h2>

        {!transcript ? (
          <p className="muted">
            {inFlight ? 'Not transcribed yet.' : 'No transcript for this recording.'}
          </p>
        ) : segments.length > 0 ? (
          <ol className="segments">
            {segments.map((segment) => {
              const active =
                segment.start_time != null &&
                segment.end_time != null &&
                currentTime >= segment.start_time &&
                currentTime < segment.end_time

              return (
                <li key={segment.id} className={active ? 'segment active' : 'segment'}>
                  <button
                    type="button"
                    className="segment-time"
                    onClick={() => seekTo(segment.start_time)}
                    disabled={segment.start_time == null}
                    title="Jump to this point"
                  >
                    {formatDuration(segment.start_time)}
                  </button>

                  <div className="segment-body">
                    <div className="segment-speaker">Speaker {segment.speaker}</div>
                    <p>{segment.text}</p>
                  </div>
                </li>
              )
            })}
          </ol>
        ) : (
          <p className="prose">{transcript.transcript}</p>
        )}
      </div>
    </div>
  )
}
