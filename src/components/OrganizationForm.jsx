import { useState } from 'react'

import { errorMessage } from '../api/client'

/**
 * Shared by create and edit. On edit the caller passes `organization`, which
 * also unlocks the is_active toggle -- OrganizationCreate has no such field,
 * only OrganizationUpdate does.
 */
export default function OrganizationForm({ organization, onSubmit, onCancel }) {
  const isEdit = Boolean(organization)

  const [form, setForm] = useState({
    name: organization?.name ?? '',
    domain: organization?.domain ?? '',
    phone: organization?.phone ?? '',
    address: organization?.address ?? '',
    website: organization?.website ?? '',
    is_active: organization?.is_active ?? true,
  })

  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const update = (key) => (event) =>
    setForm((previous) => ({ ...previous, [key]: event.target.value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    // Optional text fields are sent as null rather than "" so the API stores an
    // absent value instead of an empty string.
    const payload = {
      name: form.name.trim(),
      domain: form.domain.trim(),
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      website: form.website.trim() || null,
    }

    if (isEdit) {
      payload.is_active = form.is_active
    }

    try {
      await onSubmit(payload)
    } catch (err) {
      setError(errorMessage(err, 'Could not save the organization.'))
      setSubmitting(false)
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="field-row">
        <label className="field">
          <span>Name *</span>
          <input value={form.name} onChange={update('name')} required />
        </label>

        <label className="field">
          <span>Domain *</span>
          <input
            value={form.domain}
            onChange={update('domain')}
            placeholder="company.com"
            required
          />
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span>Phone</span>
          <input value={form.phone} onChange={update('phone')} />
        </label>

        <label className="field">
          <span>Website</span>
          <input
            value={form.website}
            onChange={update('website')}
            placeholder="https://company.com"
          />
        </label>
      </div>

      <label className="field">
        <span>Address</span>
        <textarea rows={3} value={form.address} onChange={update('address')} />
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
          {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create organization'}
        </button>
      </div>
    </form>
  )
}
