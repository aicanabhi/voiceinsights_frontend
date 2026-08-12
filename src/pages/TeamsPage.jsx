import { useCallback, useEffect, useMemo, useState } from 'react'

import { errorMessage } from '../api/client'
import { listOrganizations } from '../api/organizations'
import { createTeam, deleteTeam, listTeams, updateTeam } from '../api/teams'
import { listUsers } from '../api/users'
import Modal from '../components/Modal'
import TeamForm from '../components/TeamForm'
import { ROLES, useAuth } from '../context/AuthContext'
import { canManageTeams } from '../lib/permissions'

export default function TeamsPage() {
  const { user, hasRole } = useAuth()
  const canManage = canManageTeams(user?.role)

  const [teams, setTeams] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [members, setMembers] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')

  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      // Users are already role-scoped, so they give an accurate member count
      // for every team this user can see.
      const [teamRows, userRows] = await Promise.all([listTeams(), listUsers()])

      setTeams(teamRows)
      setMembers(userRows)

      if (hasRole(ROLES.SUPER_ADMIN)) {
        setOrganizations(await listOrganizations())
      } else if (user?.organization_id != null) {
        // An org admin cannot list organizations, but only ever needs its own
        // name for display.
        setOrganizations([])
      }
    } catch (err) {
      setError(errorMessage(err, 'Could not load teams.'))
    } finally {
      setLoading(false)
    }
  }, [hasRole, user?.organization_id])

  useEffect(() => {
    load()
  }, [load])

  const memberCount = useCallback(
    (teamId) => members.filter((member) => member.team_id === teamId).length,
    [members],
  )

  const organizationName = useCallback(
    (id) => organizations.find((organization) => organization.id === id)?.name ?? `#${id}`,
    [organizations],
  )

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return teams

    return teams.filter(
      (team) =>
        team.name.toLowerCase().includes(term) ||
        (team.description || '').toLowerCase().includes(term),
    )
  }, [teams, query])

  const handleCreate = async (payload) => {
    const created = await createTeam(payload)

    setTeams((previous) => [...previous, created])
    setCreating(false)
    setNotice(`Created “${created.name}”.`)
  }

  const handleUpdate = async (payload) => {
    const updated = await updateTeam(editing.id, payload)

    setTeams((previous) => previous.map((team) => (team.id === updated.id ? updated : team)))
    setEditing(null)
    setNotice(`Updated “${updated.name}”.`)
  }

  const handleDelete = async () => {
    setDeleting(true)
    setError('')

    try {
      await deleteTeam(confirmDelete.id)

      setTeams((previous) => previous.filter((team) => team.id !== confirmDelete.id))
      setNotice(`Deleted “${confirmDelete.name}”.`)
      setConfirmDelete(null)
    } catch (err) {
      setError(errorMessage(err, 'Could not delete the team.'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Teams</h1>
          <p className="muted">
            {hasRole(ROLES.TEAM_LEAD) ? 'Your team.' : 'Teams you can manage.'}
          </p>
        </div>

        {canManage && (
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            New team
          </button>
        )}
      </header>

      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-success">{notice}</div>}

      {teams.length > 1 && (
        <input
          className="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search teams…"
        />
      )}

      <div className="card">
        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : visible.length === 0 ? (
          <div className="empty-state">
            <h2>No teams</h2>
            <p className="muted">
              {teams.length === 0
                ? 'Create a team so agents and team leads can be assigned to one.'
                : 'No team matches that search.'}
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  {hasRole(ROLES.SUPER_ADMIN) && <th>Organization</th>}
                  <th>Members</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>

              <tbody>
                {visible.map((team) => (
                  <tr key={team.id}>
                    <td className="strong">
                      {team.name}
                      {team.id === user?.team_id && <span className="tag">yours</span>}
                      {team.description && <div className="row-sub">{team.description}</div>}
                    </td>

                    {hasRole(ROLES.SUPER_ADMIN) && <td>{organizationName(team.organization_id)}</td>}

                    <td>{memberCount(team.id)}</td>
                    <td>
                      <span className={team.is_active ? 'pill pill-active' : 'pill pill-muted'}>
                        {team.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="row-actions">
                      {canManage && (
                        <>
                          <button
                            type="button"
                            className="btn btn-small"
                            onClick={() => setEditing(team)}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="btn btn-small btn-danger"
                            onClick={() => setConfirmDelete(team)}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {creating && (
        <Modal title="New team" onClose={() => setCreating(false)}>
          <TeamForm
            organizations={organizations}
            onSubmit={handleCreate}
            onCancel={() => setCreating(false)}
          />
        </Modal>
      )}

      {editing && (
        <Modal title={`Edit ${editing.name}`} onClose={() => setEditing(null)}>
          <TeamForm
            team={editing}
            organizations={organizations}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Delete team" onClose={() => setConfirmDelete(null)}>
          <p>
            Delete <strong>{confirmDelete.name}</strong>?
            {memberCount(confirmDelete.id) > 0 && (
              <>
                {' '}
                It still has <strong>{memberCount(confirmDelete.id)}</strong> member(s).
              </>
            )}
          </p>

          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>
              Cancel
            </button>

            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
