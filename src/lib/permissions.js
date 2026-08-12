import { ROLES } from '../context/AuthContext'

/**
 * Which roles a given role may create, mirroring UserService.create_user.
 * A super admin only ever creates org admins; org admins staff their own
 * organization; a team lead adds agents to their own team.
 */
export function creatableRoles(role) {
  switch (role) {
    case ROLES.SUPER_ADMIN:
      return [ROLES.ORG_ADMIN]
    case ROLES.ORG_ADMIN:
      return [ROLES.TEAM_LEAD, ROLES.AGENT]
    case ROLES.TEAM_LEAD:
      return [ROLES.AGENT]
    default:
      return []
  }
}

export function canCreateUsers(role) {
  return creatableRoles(role).length > 0
}

/**
 * Mirrors UserService._ensure_can_manage. The backend is the real authority --
 * this only decides whether to show the button.
 */
export function canManageUser(currentUser, target) {
  if (!currentUser || !target) return false

  if (target.role === ROLES.SUPER_ADMIN) {
    return currentUser.role === ROLES.SUPER_ADMIN
  }

  if (currentUser.role === ROLES.SUPER_ADMIN) return true

  if (currentUser.role === ROLES.ORG_ADMIN) {
    return (
      currentUser.organization_id != null &&
      target.organization_id === currentUser.organization_id
    )
  }

  if (currentUser.role === ROLES.TEAM_LEAD) {
    return currentUser.team_id != null && target.team_id === currentUser.team_id
  }

  return currentUser.id === target.id
}

/** Only these roles may create or edit teams (see TeamService). */
export function canManageTeams(role) {
  return role === ROLES.SUPER_ADMIN || role === ROLES.ORG_ADMIN
}

/**
 * GET /teams/ raises 403 for an AGENT rather than returning an empty list, so
 * the call has to be skipped entirely for that role.
 */
export function canListTeams(role) {
  return (
    role === ROLES.SUPER_ADMIN ||
    role === ROLES.ORG_ADMIN ||
    role === ROLES.TEAM_LEAD
  )
}

/**
 * Who a call may be attributed to, mirroring
 * MediaService._ensure_can_attribute_to. Admins may attribute to anyone in the
 * organization, a team lead to their team, an agent only to themselves.
 */
export function attributableUsers(currentUser, users) {
  if (!currentUser) return []

  if (
    currentUser.role === ROLES.SUPER_ADMIN ||
    currentUser.role === ROLES.ORG_ADMIN
  ) {
    return users
  }

  if (currentUser.role === ROLES.TEAM_LEAD) {
    return currentUser.team_id == null
      ? []
      : users.filter((user) => user.team_id === currentUser.team_id)
  }

  return users.filter((user) => user.id === currentUser.id)
}
