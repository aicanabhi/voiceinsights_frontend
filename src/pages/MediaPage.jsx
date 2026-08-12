import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { errorMessage } from '../api/client'
import { IN_FLIGHT_STATUSES, MEDIA_STATUS, listMedia } from '../api/media'
import Modal from '../components/Modal'
import StatusPill from '../components/StatusPill'
import UploadDialog from '../components/UploadDialog'
import { formatBytes, formatDateTime } from '../lib/format'

const POLL_MS = 5000

export default function MediaPage() {
  const [media, setMedia] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [uploading, setUploading] = useState(false)

  // Kept in a ref so the poll effect does not restart on every refresh.
  const refresh = useRef(null)

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)

    try {
      setMedia(await listMedia())
      if (!silent) setError('')
    } catch (err) {
      // A failed background poll should not wipe the table that is on screen.
      if (!silent) setError(errorMessage(err, 'Could not load recordings.'))
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  refresh.current = load

  useEffect(() => {
    load()
  }, [load])

  const inFlight = useMemo(
    () => media.some((item) => IN_FLIGHT_STATUSES.includes(item.status)),
    [media],
  )

  // Only poll while something is actually being worked on. The worker updates
  // rows out of band, so there is nothing to watch once everything settles.
  useEffect(() => {
    if (!inFlight) return undefined

    const timer = setInterval(() => refresh.current({ silent: true }), POLL_MS)
    return () => clearInterval(timer)
  }, [inFlight])

  const visible = useMemo(
    () => (statusFilter ? media.filter((item) => item.status === statusFilter) : media),
    [media, statusFilter],
  )

  const handleUploaded = (result) => {
    setUploading(false)

    const parts = [`Queued ${result.accepted.length} file(s).`]

    if (result.rejected.length > 0) {
      // Per-file outcome: a bad file does not fail the rest of the batch, so
      // name the ones that were dropped instead of reporting a flat success.
      parts.push(
        `Rejected ${result.rejected.length}: ` +
          result.rejected
            .map((item) => `${item.filename || 'file'} — ${item.reason}`)
            .join('; '),
      )
    }

    setNotice(parts.join(' '))
    load({ silent: true })
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Recordings</h1>
          <p className="muted">
            Upload calls and follow transcription. {inFlight && 'Refreshing…'}
          </p>
        </div>

        <button type="button" className="btn btn-primary" onClick={() => setUploading(true)}>
          Upload recordings
        </button>
      </header>

      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-success">{notice}</div>}

      {media.length > 0 && (
        <div className="filter-bar">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">All statuses</option>
            {Object.values(MEDIA_STATUS).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <button type="button" className="btn btn-small" onClick={() => load()}>
            Refresh
          </button>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : visible.length === 0 ? (
          <div className="empty-state">
            <h2>No recordings</h2>
            <p className="muted">
              {media.length === 0
                ? 'Upload a call to get started.'
                : 'No recording has that status.'}
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Status</th>
                  <th>Provider</th>
                  <th>Language</th>
                  <th>Size</th>
                  <th>Uploaded</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>

              <tbody>
                {visible.map((item) => (
                  <tr key={item.id}>
                    <td className="strong">
                      {item.original_filename}
                      {item.status === MEDIA_STATUS.FAILED && item.error_message && (
                        <div className="error-detail" title={item.error_message}>
                          {item.error_message}
                        </div>
                      )}
                    </td>
                    <td>
                      <StatusPill status={item.status} />
                      {item.attempts > 1 && (
                        <span className="tag">attempt {item.attempts}</span>
                      )}
                    </td>
                    <td>{item.provider}</td>
                    <td>{item.language}</td>
                    <td>{formatBytes(item.file_size)}</td>
                    <td>{formatDateTime(item.created_at)}</td>
                    <td className="row-actions">
                      <Link className="btn btn-small" to={`/media/${item.id}`}>
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {uploading && (
        <Modal title="Upload recordings" onClose={() => setUploading(false)}>
          <UploadDialog onUploaded={handleUploaded} onCancel={() => setUploading(false)} />
        </Modal>
      )}
    </div>
  )
}
