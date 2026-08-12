import client from './client'

// The backend scopes this by role on its own: a super admin sees everyone, an
// org admin their organization, a team lead their team, an agent only self.
export async function listUsers() {
  const { data } = await client.get('/users/')
  return data
}

export async function getUser(id) {
  const { data } = await client.get(`/users/${id}`)
  return data
}

export async function createUser(payload) {
  const { data } = await client.post('/users/', payload)
  return data
}

export async function updateUser(id, payload) {
  const { data } = await client.put(`/users/${id}`, payload)
  return data
}

export async function deleteUser(id) {
  const { data } = await client.delete(`/users/${id}`)
  return data
}
