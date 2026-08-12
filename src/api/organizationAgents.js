import client from './client'

// Every agent on the platform. Super admin only.
export async function listAllAgents() {
  const { data } = await client.get('/organization-agents/')
  return data
}

// One organization's agents. Super admin, or that organization's org admin.
export async function listAgentsForOrganization(organizationId) {
  const { data } = await client.get(`/organization-agents/${organizationId}`)
  return data
}

export async function getAgent(organizationId, provider) {
  const { data } = await client.get(`/organization-agents/${organizationId}/${provider}`)
  return data
}

export async function createAgent(payload) {
  const { data } = await client.post('/organization-agents/', payload)
  return data
}

/**
 * Keyed by organization + provider, not by id -- provider is the routing key
 * and cannot be changed. Moving to another provider means creating a second
 * agent for it.
 */
export async function updateAgent(organizationId, provider, payload) {
  const { data } = await client.put(
    `/organization-agents/${organizationId}/${provider}`,
    payload,
  )
  return data
}

export async function deleteAgent(organizationId, provider) {
  const { data } = await client.delete(`/organization-agents/${organizationId}/${provider}`)
  return data
}
