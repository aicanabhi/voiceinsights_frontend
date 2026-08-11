import client from './client'

// The trailing slash on the collection routes is required -- FastAPI declares
// them as "/organizations/" and a redirect would drop the Authorization header.
export async function listOrganizations() {
  const { data } = await client.get('/organizations/')
  return data
}

export async function getOrganization(id) {
  const { data } = await client.get(`/organizations/${id}`)
  return data
}

export async function createOrganization(payload) {
  const { data } = await client.post('/organizations/', payload)
  return data
}

export async function updateOrganization(id, payload) {
  const { data } = await client.put(`/organizations/${id}`, payload)
  return data
}

export async function deleteOrganization(id) {
  const { data } = await client.delete(`/organizations/${id}`)
  return data
}
