import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  createOrganization,
  deleteOrganization,
  getOrganization,
  listOrganizations,
  updateOrganization,
} from '../api/organizations'
import { errorMessage } from '../api/client'
import { ROLES, useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import OrganizationForm from '../components/OrganizationForm'

function formatDate(value) {
  if (!value) return '—'

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString()
}

export default function OrganizationsPage() {
  const { user, hasRole } = useAuth()
  const isSuperAdmin = hasRole(ROLES.SUPER_ADMIN)

  const [organizations, setOrganizations] = useState([])
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
      // Only a super admin may list every organization. An org admin is scoped
      // to their own, so we fetch just that one by id.
      if (isSuperAdmin) {
        setOrganizations(await listOrganizations())
      } else if (user?.organization_id) {
        setOrganizations([await getOrganization(user.organization_id)])
      } else {
        setOrganizations([])
      }
    } catch (err) {
      setError(errorMessage(err, 'Could not load organizations.'))
    } finally {
      setLoading(false)
    }
  }, [isSuperAdmin, user?.organization_id])

  useEffect(() => {
    load()
  }, [load])

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()

    if (!term) return organizations

    return organizations.filter(
      (organization) =>
        organization.name.toLowerCase().includes(term) ||
        organization.domain.toLowerCase().includes(term),
    )
  }, [organizations, query])

  const handleCreate = async (payload) => {
    const created = await createOrganization(payload)

    setOrganizations((previous) => [...previous, created])
    setCreating(false)
    setNotice(`Created “${created.name}”.`)
  }

  const handleUpdate = async (payload) => {
    const updated = await updateOrganization(editing.id, payload)

    setOrganizations((previous) =>
      previous.map((organization) =>
        organization.id === updated.id ? updated : organization,
      ),
    )

    setEditing(null)
    setNotice(`Updated “${updated.name}”.`)
  }

  const handleDelete = async () => {
    setDeleting(true)
    setError('')

    try {
      const result = await deleteOrganization(confirmDelete.id)

      setOrganizations((previous) =>
        previous.filter((organization) => organization.id !== confirmDelete.id),
      )

      // The API reports the cascade, which is worth surfacing -- deleting an
      // organization also removes its teams and users.
      setNotice(
        `Deleted “${confirmDelete.name}” along with ${result.deleted_users} user(s) ` +
          `and ${result.deleted_teams} team(s).`,
      )

      setConfirmDelete(null)
    } catch (err) {
      setError(errorMessage(err, 'Could not delete the organization.'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Organizations</h1>
          <p className="muted">
            {isSuperAdmin
              ? 'Every organization on the platform.'
              : 'Your organization.'}
          </p>
        </div>

        {isSuperAdmin && (
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            New organization
          </button>
        )}
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      {notice && (
        <div className="alert alert-success" onAnimationEnd={() => setNotice('')}>
          {notice}
        </div>
      )}

      {isSuperAdmin && organizations.length > 0 && (
        <input
          className="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name or domain…"
        />
      )}

      <div className="card">
        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : visible.length === 0 ? (
          <div className="empty-state">
            <h2>Nothing here yet</h2>
            <p className="muted">
              {organizations.length === 0
                ? 'No organizations to show.'
                : 'No organization matches that search.'}
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Domain</th>
                  <th>Phone</th>
                  <th>Website</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>

              <tbody>
                {visible.map((organization) => (
                  <tr key={organization.id}>
                    <td className="strong">{organization.name}</td>
                    <td>{organization.domain}</td>
                    <td>{organization.phone || '—'}</td>
                    <td>
                      {organization.website ? (
                        <a href={organization.website} target="_blank" rel="noreferrer">
                          {organization.website}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <span
                        className={
                          organization.is_active ? 'pill pill-active' : 'pill pill-muted'
                        }
                      >
                        {organization.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{formatDate(organization.created_at)}</td>
                    <td className="row-actions">
                      <button
                        type="button"
                        className="btn btn-small"
                        onClick={() => setEditing(organization)}
                      >
                        Edit
                      </button>

                      {isSuperAdmin && (
                        <button
                          type="button"
                          className="btn btn-small btn-danger"
                          onClick={() => setConfirmDelete(organization)}
                        >
                          Delete
                        </button>
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
        <Modal title="New organization" onClose={() => setCreating(false)}>
          <OrganizationForm onSubmit={handleCreate} onCancel={() => setCreating(false)} />
        </Modal>
      )}

      {editing && (
        <Modal title={`Edit ${editing.name}`} onClose={() => setEditing(null)}>
          <OrganizationForm
            organization={editing}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Delete organization" onClose={() => setConfirmDelete(null)}>
          <p>
            Delete <strong>{confirmDelete.name}</strong>? This also deletes every
            team and user inside it. This cannot be undone.
          </p>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setConfirmDelete(null)}
            >
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
