import client from './client'

import { ROLES } from '../context/AuthContext'

export async function superAdminDashboard() {
  const { data } = await client.get('/dashboard/super-admin')
  return data
}

export async function organizationDashboard(organizationId) {
  const { data } = await client.get(`/dashboard/organization/${organizationId}`)
  return data
}

export async function teamDashboard(teamId) {
  const { data } = await client.get(`/dashboard/team/${teamId}`)
  return data
}

export async function agentDashboard(agentId) {
  const { data } = await client.get(`/dashboard/agent/${agentId}`)
  return data
}

/**
 * There is no single "my dashboard" route -- each role has its own, keyed by a
 * different id. This picks the one the current user is actually entitled to.
 * Returns null when the account is unscoped (an ORG_ADMIN with no
 * organization, say), because every scoped route would 403.
 */
export function defaultScopeFor(user) {
  if (!user) return null

  switch (user.role) {
    case ROLES.SUPER_ADMIN:
      return { type: 'platform', label: 'Platform' }

    case ROLES.ORG_ADMIN:
      return user.organization_id == null
        ? null
        : { type: 'organization', id: user.organization_id, label: 'My organization' }

    case ROLES.TEAM_LEAD:
      return user.team_id == null
        ? null
        : { type: 'team', id: user.team_id, label: 'My team' }

    default:
      return { type: 'agent', id: user.id, label: 'My calls' }
  }
}

export function fetchScope(scope) {
  switch (scope.type) {
    case 'platform':
      return superAdminDashboard()
    case 'organization':
      return organizationDashboard(scope.id)
    case 'team':
      return teamDashboard(scope.id)
    case 'agent':
      return agentDashboard(scope.id)
    default:
      throw new Error(`Unknown dashboard scope: ${scope.type}`)
  }
}

/** The four responses differ only in their header fields. */
export function scopeHeading(scope, data) {
  if (!data) return scope.label

  if (data.organization) return data.organization
  if (data.team) return `Team ${data.team}`
  if (data.agent) return data.agent

  return 'Platform'
}
