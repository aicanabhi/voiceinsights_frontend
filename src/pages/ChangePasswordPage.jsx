import { useState } from 'react'

import { changePassword } from '../api/auth'
import { errorMessage } from '../api/client'

const EMPTY = {
  current_password: '',
  new_password: '',
  confirm_password: '',
}

export default function ChangePasswordPage() {
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const update = (key) => (event) =>
    setForm((previous) => ({ ...previous, [key]: event.target.value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    // The backend checks this too; catching it here saves a round trip.
    if (form.new_password !== form.confirm_password) {
      setError('New password and confirmation do not match.')
      return
    }

    setSubmitting(true)

    try {
      const data = await changePassword(form)
      setSuccess(data?.message || 'Password changed successfully.')
      setForm(EMPTY)
    } catch (err) {
      setError(errorMessage(err, 'Could not change the password.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Change password</h1>
          <p className="muted">Update the password for your own account.</p>
        </div>
      </header>

      <form className="card form-card" onSubmit={handleSubmit}>
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <label className="field">
          <span>Current password</span>
          <input
            type="password"
            value={form.current_password}
            onChange={update('current_password')}
            autoComplete="current-password"
            required
          />
        </label>

        <label className="field">
          <span>New password</span>
          <input
            type="password"
            value={form.new_password}
            onChange={update('new_password')}
            autoComplete="new-password"
            required
          />
        </label>

        <label className="field">
          <span>Confirm new password</span>
          <input
            type="password"
            value={form.confirm_password}
            onChange={update('confirm_password')}
            autoComplete="new-password"
            required
          />
        </label>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Change password'}
          </button>
        </div>
      </form>
    </div>
  )
}
