import client from './client'

export const MAX_FILES_PER_REQUEST = 10
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024

export const PROVIDERS = ['DEEPGRAM', 'ELEVENLABS', 'CARTESIA']

export const MEDIA_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  TRANSCRIBED: 'TRANSCRIBED',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
}

// A job is still moving while it is in one of these -- the list view polls
// only when at least one row is in flight.
export const IN_FLIGHT_STATUSES = [MEDIA_STATUS.PENDING, MEDIA_STATUS.PROCESSING]

export async function listMedia() {
  const { data } = await client.get('/media/')
  return data
}

export async function getMedia(id) {
  const { data } = await client.get(`/media/${id}`)
  return data
}

export async function getCallResult(id) {
  const { data } = await client.get(`/media/${id}/result`)
  return data
}

/**
 * calling_agent_id and provider are QUERY parameters, not form fields -- the
 * body is multipart and carries only the files. Sending them in the body gets
 * a 422.
 */
export async function uploadMedia({ callingAgentId, provider, files, onProgress }) {
  const form = new FormData()

  for (const file of files) {
    form.append('files', file)
  }

  const { data } = await client.post('/media/upload', form, {
    params: {
      calling_agent_id: callingAgentId,
      provider,
    },
    onUploadProgress: (event) => {
      if (onProgress && event.total) {
        onProgress(Math.round((event.loaded * 100) / event.total))
      }
    },
  })

  return data
}

/**
 * The audio route needs the Authorization header, so a plain <audio src="...">
 * would get a 401. Pull it as a blob through the authenticated client and hand
 * back an object URL -- the caller must revoke it when done.
 */
export async function fetchAudioObjectUrl(id) {
  const response = await client.get(`/media/${id}/audio`, {
    responseType: 'blob',
  })

  return URL.createObjectURL(response.data)
}
