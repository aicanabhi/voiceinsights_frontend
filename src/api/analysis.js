import client from './client'

export async function listAnalysis() {
  const { data } = await client.get('/analysis/')
  return data
}

export async function getAnalysis(id) {
  const { data } = await client.get(`/analysis/${id}`)
  return data
}

/**
 * Re-runs the LLM over an existing transcript. Requires the media to be
 * transcribed and the organization to have an agent config for the provider
 * the media was transcribed with -- otherwise the API returns 400.
 */
export async function generateAnalysis(mediaId) {
  const { data } = await client.post(`/analysis/generate/${mediaId}`)
  return data
}
