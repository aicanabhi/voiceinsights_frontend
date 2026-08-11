import client from './client'

/**
 * The backend uses OAuth2PasswordRequestForm, so this endpoint takes
 * form-encoded `username`/`password` -- not JSON, and the email goes in the
 * field named `username`.
 */
export async function login(email, password) {
  const form = new URLSearchParams()
  form.append('username', email)
  form.append('password', password)

  const { data } = await client.post('/auth/login', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })

  return data
}

export async function changePassword(payload) {
  const { data } = await client.post('/auth/change-password', payload)
  return data
}
