import { useEffect, useMemo, useState } from 'react'

import { errorMessage } from '../api/client'
import { listTeams } from '../api/teams'
import { ROLES, useAuth } from '../context/AuthContext'
import { canListTeams, creatableRoles } from '../lib/permissions'

export default function UserForm({ user, onSubmit, onCancel }) {
  const isEdit = Boolean(user)
  const { user: currentUser } = useAuth()

  const roleOptions = creatableRoles(currentUser?.role)
  const isSelf = isEdit && user.id === currentUser?.id

  const [form, setForm] = useState({
    full_name: user?.full_name ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    password: '',
    role: user?.role ?? roleOptions[0] ?? ROLES.AGENT,
    // A super admin picks the organization; everyone else can only create
    // inside their own, so it is prefilled and locked.
    organization_id:
      user?.organization_id ??
      (currentUser?.role === ROLES.SUPER_ADMIN ? '' : currentUser?.organization_id ?? ''),
    team_id:
      user?.team_id ??
      (currentUser?.role === ROLES.TEAM_LEAD ? currentUser?.team_id ?? '' : ''),
    is_active: user?.is_active ?? true,
  })

  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [teams, setTeams] = useState([])

  // GET /teams/ 403s for an AGENT, so it is only called for roles that may
  // list them. A failure here must not break the form -- the field falls back
  // to a plain number input.
  useEffect(() => {
    if (!canListTeams(currentUser?.role)) return undefined

    let cancelled = false

    listTeams()
      .then((rows) => !cancelled && setTeams(rows))
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [currentUser?.role])

  const update = (key) => (event) =>
    setForm((previous) => ({ ...previous, [key]: event.target.value }))

  // team_id is required for TEAM_LEAD and AGENT, and meaningless for others.
  const needsTeam = form.role === ROLES.TEAM_LEAD || form.role === ROLES.AGENT

  const lockOrganization =
    !isEdit && currentUser?.role !== ROLES.SUPER_ADMIN
  const lockTeam = !isEdit && currentUser?.role === ROLES.TEAM_LEAD

  // A team belongs to an organization, so only offer the ones that match the
  // organization currently selected.
  const teamOptions = useMemo(() => {
    const organizationId = Number(form.organization_id)

    return Number.isFinite(organizationId) && organizationId > 0
      ? teams.filter((team) => team.organization_id === organizationId)
      : teams
  }, [teams, form.organization_id])

  const toNumberOrNull = (value) => {
    const text = String(value).trim()
    return text === '' ? null : Number(text)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    // UserUpdate has no email or role field -- those are fixed after creation.
    const payload = isEdit
      ? {
          full_name: form.full_name.trim(),
          phone: form.phone.trim() || null,
          organization_id: toNumberOrNull(form.organization_id),
          team_id: toNumberOrNull(form.team_id),
          is_active: form.is_active,
        }
      : {
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          password: form.password,
          role: form.role,
          organization_id: toNumberOrNull(form.organization_id),
          team_id: needsTeam ? toNumberOrNull(form.team_id) : null,
        }

    // Only send a new password when one was typed; an empty string would be
    // hashed and lock the user out.
    if (isEdit && form.password) {
      payload.password = form.password
    }

    setSubmitting(true)

    try {
      await onSubmit(payload)
    } catch (err) {
      setError(errorMessage(err, 'Could not save the user.'))
      setSubmitting(false)
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="field-row">
        <label className="field">
          <span>Full name *</span>
          <input value={form.full_name} onChange={update('full_name')} required />
        </label>

        <label className="field">
          <span>Email {isEdit ? '' : '*'}</span>
          <input
            type="email"
            value={form.email}
            onChange={update('email')}
            disabled={isEdit}
            required={!isEdit}
          />
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span>Phone</span>
          <input value={form.phone} onChange={update('phone')} />
        </label>

        <label className="field">
          <span>{isEdit ? 'New password (leave blank to keep)' : 'Password *'}</span>
          <input
            type="password"
            value={form.password}
            onChange={update('password')}
            autoComplete="new-password"
            required={!isEdit}
          />
        </label>
      </div>

      {!isEdit && (
        <label className="field">
          <span>Role *</span>
          <select value={form.role} onChange={update('role')} required>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="field-row">
        <label className="field">
          <span>Organization ID {isEdit ? '' : '*'}</span>
          <input
            type="number"
            value={form.organization_id}
            onChange={update('organization_id')}
            disabled={lockOrganization}
            required={!isEdit}
          />
        </label>

        <label className="field">
          <span>Team {!isEdit && needsTeam ? '*' : ''}</span>

          {teams.length > 0 ? (
            <select
              value={form.team_id}
              onChange={update('team_id')}
              disabled={lockTeam || (!isEdit && !needsTeam)}
              required={!isEdit && needsTeam}
            >
              <option value="">{needsTeam ? 'Select…' : 'None'}</option>
              {teamOptions.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="number"
              value={form.team_id}
              onChange={update('team_id')}
              disabled={lockTeam || (!isEdit && !needsTeam)}
              required={!isEdit && needsTeam}
            />
          )}

          {needsTeam && teams.length === 0 && (
            <span className="hint">
              No teams available — create one first.
            </span>
          )}
        </label>
      </div>

      {isEdit && (
        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.is_active}
            /* The API rejects deactivating your own account with a 400, so
               don't offer the toggle on yourself. */
            disabled={isSelf}
            onChange={(event) =>
              setForm((previous) => ({ ...previous, is_active: event.target.checked }))
            }
          />
          <span>Active</span>
          {isSelf && <span className="hint">You cannot deactivate your own account.</span>}
        </label>
      )}

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create user'}
        </button>
      </div>
    </form>
  )
}
