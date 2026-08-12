import { useEffect, useState } from 'react'

import { errorMessage } from '../api/client'
import {
  MAX_FILES_PER_REQUEST,
  MAX_UPLOAD_BYTES,
  PROVIDERS,
  uploadMedia,
} from '../api/media'
import { listUsers } from '../api/users'
import { useAuth } from '../context/AuthContext'
import { attributableUsers } from '../lib/permissions'
import { formatBytes } from '../lib/format'

export default function UploadDialog({ onUploaded, onCancel }) {
  const { user: currentUser } = useAuth()

  const [agents, setAgents] = useState([])
  const [loadingAgents, setLoadingAgents] = useState(true)

  const [callingAgentId, setCallingAgentId] = useState('')
  const [provider, setProvider] = useState(PROVIDERS[0])
  const [files, setFiles] = useState([])

  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false

    listUsers()
      .then((data) => {
        if (cancelled) return

        // A call can only be attributed to someone the uploader manages.
        const choices = attributableUsers(currentUser, data)

        setAgents(choices)
        setCallingAgentId(String(choices[0]?.id ?? ''))
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, 'Could not load agents.'))
      })
      .finally(() => {
        if (!cancelled) setLoadingAgents(false)
      })

    return () => {
      cancelled = true
    }
  }, [currentUser])

  const handleFiles = (event) => {
    const picked = Array.from(event.target.files || [])
    setError('')

    // Both caps are enforced server side too; checking here avoids sending a
    // request that is certain to be rejected.
    if (picked.length > MAX_FILES_PER_REQUEST) {
      setError(`At most ${MAX_FILES_PER_REQUEST} files per upload.`)
      setFiles([])
      return
    }

    const tooBig = picked.find((file) => file.size > MAX_UPLOAD_BYTES)

    if (tooBig) {
      setError(
        `“${tooBig.name}” is ${formatBytes(tooBig.size)} — the limit is ` +
          `${formatBytes(MAX_UPLOAD_BYTES)} per file.`,
      )
      setFiles([])
      return
    }

    setFiles(picked)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (files.length === 0) {
      setError('Pick at least one audio file.')
      return
    }

    setSubmitting(true)
    setProgress(0)

    try {
      const result = await uploadMedia({
        callingAgentId: Number(callingAgentId),
        provider,
        files,
        onProgress: setProgress,
      })

      onUploaded(result)
    } catch (err) {
      setError(errorMessage(err, 'Upload failed.'))
      setSubmitting(false)
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="field-row">
        <label className="field">
          <span>Calling agent *</span>
          <select
            value={callingAgentId}
            onChange={(event) => setCallingAgentId(event.target.value)}
            disabled={loadingAgents || agents.length === 0}
            required
          >
            {loadingAgents && <option value="">Loading…</option>}

            {!loadingAgents && agents.length === 0 && (
              <option value="">No eligible agent</option>
            )}

            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.full_name} ({agent.role})
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Provider *</span>
          <select
            value={provider}
            onChange={(event) => setProvider(event.target.value)}
            required
          >
            {PROVIDERS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="field">
        <span>Audio files * (up to {MAX_FILES_PER_REQUEST})</span>
        <input type="file" accept="audio/*" multiple onChange={handleFiles} />
      </label>

      {files.length > 0 && (
        <ul className="file-list">
          {files.map((file) => (
            <li key={file.name}>
              <span>{file.name}</span>
              <span className="muted">{formatBytes(file.size)}</span>
            </li>
          ))}
        </ul>
      )}

      {submitting && (
        <div className="progress">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>
      )}

      <p className="muted small">
        The model and language come from your organization&apos;s agent config for
        the chosen provider. Transcription runs in the background — the list will
        show progress.
      </p>

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={submitting || agents.length === 0}
        >
          {submitting ? `Uploading ${progress}%…` : 'Upload'}
        </button>
      </div>
    </form>
  )
}
