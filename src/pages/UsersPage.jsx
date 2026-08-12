import { useCallback, useEffect, useMemo, useState } from 'react'

import { errorMessage } from '../api/client'
import { createUser, deleteUser, listUsers, updateUser } from '../api/users'
import Modal from '../components/Modal'
import UserForm from '../components/UserForm'
import { useAuth } from '../context/AuthContext'
import { canCreateUsers, canManageUser } from '../lib/permissions'

export default function UsersPage() {
  const { user: currentUser } = useAuth()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('')

  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      setUsers(await listUsers())
    } catch (err) {
      setError(errorMessage(err, 'Could not load users.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const roles = useMemo(
    () => [...new Set(users.map((user) => user.role))].sort(),
    [users],
  )

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()

    return users.filter((user) => {
      if (roleFilter && user.role !== roleFilter) return false
      if (!term) return true

      return (
        user.full_name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term)
      )
    })
  }, [users, query, roleFilter])

  const handleCreate = async (payload) => {
    const created = await createUser(payload)

    setUsers((previous) => [...previous, created])
    setCreating(false)
    setNotice(`Created ${created.full_name}.`)
  }

  const handleUpdate = async (payload) => {
    const updated = await updateUser(editing.id, payload)

    setUsers((previous) =>
      previous.map((user) => (user.id === updated.id ? updated : user)),
    )

    setEditing(null)
    setNotice(`Updated ${updated.full_name}.`)
  }

  const handleDelete = async () => {
    setDeleting(true)
    setError('')

    try {
      await deleteUser(confirmDelete.id)

      setUsers((previous) => previous.filter((user) => user.id !== confirmDelete.id))
      setNotice(`Deleted ${confirmDelete.full_name}.`)
      setConfirmDelete(null)
    } catch (err) {
      setError(errorMessage(err, 'Could not delete the user.'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Users</h1>
          <p className="muted">
            Scoped to what your role can see — organization, team, or just you.
          </p>
        </div>

        {canCreateUsers(currentUser?.role) && (
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            New user
          </button>
        )}
      </header>

      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-success">{notice}</div>}

      {users.length > 1 && (
        <div className="filter-bar">
          <input
            className="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or email…"
          />

          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            <option value="">All roles</option>
            {roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : visible.length === 0 ? (
          <div className="empty-state">
            <h2>No users</h2>
            <p className="muted">
              {users.length === 0
                ? 'Nothing to show for your role.'
                : 'No user matches that filter.'}
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Org</th>
                  <th>Team</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>

              <tbody>
                {visible.map((user) => {
                  const manageable = canManageUser(currentUser, user)

                  return (
                    <tr key={user.id}>
                      <td className="strong">
                        {user.full_name}
                        {user.id === currentUser?.id && <span className="tag">you</span>}
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <span className="pill pill-muted">{user.role}</span>
                      </td>
                      <td>{user.organization_id ?? '—'}</td>
                      <td>{user.team_id ?? '—'}</td>
                      <td>
                        <span className={user.is_active ? 'pill pill-active' : 'pill pill-muted'}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="row-actions">
                        {manageable && (
                          <button
                            type="button"
                            className="btn btn-small"
                            onClick={() => setEditing(user)}
                          >
                            Edit
                          </button>
                        )}

                        {manageable && user.id !== currentUser?.id && (
                          <button
                            type="button"
                            className="btn btn-small btn-danger"
                            onClick={() => setConfirmDelete(user)}
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {creating && (
        <Modal title="New user" onClose={() => setCreating(false)}>
          <UserForm onSubmit={handleCreate} onCancel={() => setCreating(false)} />
        </Modal>
      )}

      {editing && (
        <Modal title={`Edit ${editing.full_name}`} onClose={() => setEditing(null)}>
          <UserForm user={editing} onSubmit={handleUpdate} onCancel={() => setEditing(null)} />
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Delete user" onClose={() => setConfirmDelete(null)}>
          <p>
            Delete <strong>{confirmDelete.full_name}</strong> ({confirmDelete.email})?
            This cannot be undone.
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
