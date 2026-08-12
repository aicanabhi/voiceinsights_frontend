import { useEffect, useState } from 'react'

import { errorMessage } from '../api/client'
import { fetchAudioObjectUrl } from '../api/media'

/**
 * The audio route is authenticated, so the file is pulled as a blob through
 * the axios client rather than pointed at with a plain src -- the browser
 * would not attach the Authorization header on a bare <audio src>.
 */
export default function AudioPlayer({ mediaId, audioRef }) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let objectUrl = ''
    let cancelled = false

    fetchAudioObjectUrl(mediaId)
      .then((created) => {
        objectUrl = created

        if (cancelled) {
          URL.revokeObjectURL(created)
          return
        }

        setUrl(created)
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, 'Could not load the audio.'))
      })

    return () => {
      cancelled = true

      // Blob URLs pin the file in memory until revoked.
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [mediaId])

  if (error) {
    return <div className="alert alert-error">{error}</div>
  }

  if (!url) {
    return <div className="muted">Loading audio…</div>
  }

  return <audio ref={audioRef} src={url} controls className="audio" />
}
