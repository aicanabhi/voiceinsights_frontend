import client from './client'

/**
 * Scoped by role: a super admin sees every team, an org admin their
 * organization's, a team lead only their own. An AGENT gets a 403 -- this is
 * the one list endpoint that rejects rather than returning an empty list, so
 * callers must not fetch it for agents.
 */
export async function listTeams() {
  const { data } = await client.get('/teams/')
  return data
}

export async function getTeam(id) {
  const { data } = await client.get(`/teams/${id}`)
  return data
}

export async function createTeam(payload) {
  const { data } = await client.post('/teams/', payload)
  return data
}

// organization_id is not in TeamUpdate -- a team cannot move organization.
export async function updateTeam(id, payload) {
  const { data } = await client.put(`/teams/${id}`, payload)
  return data
}

export async function deleteTeam(id) {
  const { data } = await client.delete(`/teams/${id}`)
  return data
}
