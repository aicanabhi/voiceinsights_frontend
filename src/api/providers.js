import client from './client'

/** [{ provider, models }] -- the allowed model list per provider. */
export async function listProviders() {
  const { data } = await client.get('/providers/')
  return data
}

// Language enum values as the API stores them.
export const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'hinglish', label: 'Hinglish' },
]

export const AGENT_STATUSES = ['ACTIVE', 'INACTIVE']
