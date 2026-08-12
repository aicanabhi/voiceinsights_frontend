import { useState } from 'react'

import { errorMessage } from '../api/client'
import { ROLES, useAuth } from '../context/AuthContext'

export default function TeamForm({ team, organizations, onSubmit, onCancel }) {
  const isEdit = Boolean(team)
  const { user: currentUser } = useAuth()

  const isSuperAdmin = currentUser?.role === ROLES.SUPER_ADMIN

  const [form, setForm] = useState({
    // An org admin can only create inside their own organization, so it is
    // prefilled and locked rather than offered as a choice.
    organization_id:
      team?.organization_id ?? (isSuperAdmin ? '' : currentUser?.organization_id ?? ''),
    name: team?.name ?? '',
    description: team?.description ?? '',
    is_active: team?.is_active ?? true,
  })

  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const update = (key) => (event) =>
    setForm((previous) => ({ ...previous, [key]: event.target.value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    // TeamUpdate has no organization_id -- a team cannot change organization.
    const payload = isEdit
      ? {
          name: form.name.trim(),
          description: form.description.trim() || null,
          is_active: form.is_active,
        }
      : {
          organization_id: Number(form.organization_id),
          name: form.name.trim(),
          description: form.description.trim() || null,
        }

    setSubmitting(true)

    try {
      await onSubmit(payload)
    } catch (err) {
      setError(errorMessage(err, 'Could not save the team.'))
      setSubmitting(false)
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      {error && <div className="alert alert-error">{error}</div>}

      <label className="field">
        <span>Organization *</span>

        {isSuperAdmin && !isEdit && organizations.length > 0 ? (
          <select value={form.organization_id} onChange={update('organization_id')} required>
            <option value="">Select…</option>
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            value={
              organizations.find((o) => o.id === Number(form.organization_id))?.name ??
              form.organization_id
            }
            disabled
          />
        )}

        {isEdit && <span className="hint">A team cannot change organization.</span>}
      </label>

      <label className="field">
        <span>Name *</span>
        <input value={form.name} onChange={update('name')} required />
        <span className="hint">Must be unique within the organization.</span>
      </label>

      <label className="field">
        <span>Description</span>
        <textarea rows={3} value={form.description} onChange={update('description')} />
      </label>

      {isEdit && (
        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(event) =>
              setForm((previous) => ({ ...previous, is_active: event.target.checked }))
            }
          />
          <span>Active</span>
        </label>
      )}

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create team'}
        </button>
      </div>
    </form>
  )
}
