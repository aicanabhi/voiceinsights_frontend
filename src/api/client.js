import axios from 'axios'

export const TOKEN_KEY = 'vi.access_token'
export const USER_KEY = 'vi.user'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1',
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

// A 401 means the token is gone or expired. Clear it and bounce to /login so
// the app never sits in a half-authenticated state. The reload is deliberate:
// it drops any stale state the pages were holding.
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status

    if (status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      window.location.assign('/login')
    }

    return Promise.reject(error)
  },
)

/**
 * FastAPI reports errors as `detail`, which is a string for HTTPException but
 * a list of field objects for 422 validation failures. Flatten both into one
 * message so callers can render it directly.
 */
export function errorMessage(error, fallback = 'Something went wrong.') {
  const detail = error?.response?.data?.detail

  if (typeof detail === 'string') {
    return detail
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        const field = Array.isArray(item.loc) ? item.loc.slice(1).join('.') : ''
        return field ? `${field}: ${item.msg}` : item.msg
      })
      .join(', ')
  }

  if (error?.code === 'ERR_NETWORK') {
    return 'Cannot reach the API. Is the backend running?'
  }

  return error?.message || fallback
}

export default client
