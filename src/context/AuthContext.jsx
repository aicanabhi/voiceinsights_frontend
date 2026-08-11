import { createContext, useCallback, useContext, useMemo, useState } from 'react'

import { TOKEN_KEY, USER_KEY } from '../api/client'
import { login as loginRequest } from '../api/auth'

const AuthContext = createContext(null)

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ORG_ADMIN: 'ORG_ADMIN',
  TEAM_LEAD: 'TEAM_LEAD',
  AGENT: 'AGENT',
}

function readStoredUser() {
  // There is no /auth/me endpoint, so the user object from the login response
  // is what we persist and rehydrate from on reload.
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    localStorage.removeItem(USER_KEY)
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser)
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))

  const login = useCallback(async (email, password) => {
    const data = await loginRequest(email, password)

    localStorage.setItem(TOKEN_KEY, data.access_token)
    localStorage.setItem(USER_KEY, JSON.stringify(data.user))

    setToken(data.access_token)
    setUser(data.user)

    return data.user
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)

    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      token,
      login,
      logout,
      isAuthenticated: Boolean(token && user),
      hasRole: (...roles) => Boolean(user && roles.includes(user.role)),
    }),
    [user, token, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider')
  }

  return context
}
