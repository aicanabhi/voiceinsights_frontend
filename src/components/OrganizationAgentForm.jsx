import { useEffect, useMemo, useState } from 'react'

import { errorMessage } from '../api/client'
import { AGENT_STATUSES, LANGUAGES } from '../api/providers'

/**
 * Create / edit an organization's agent for one provider.
 *
 * Two rules come straight from the API and shape the form:
 *   - `provider` is the routing key and is not updatable, so it is locked on
 *     edit. A different provider means a second agent.
 *   - `security_key` is write-only. The response only reports
 *     `has_security_key`, so the field starts empty on edit and is sent only
 *     when something was typed -- otherwise the stored key would be wiped.
 */
export default function OrganizationAgentForm({
  agent,
  providers,
  organizations,
  fixedOrganizationId,
  onSubmit,
  onCancel,
}) {
  const isEdit = Boolean(agent)

  const [form, setForm] = useState({
    organization_id: agent?.organization_id ?? fixedOrganizationId ?? '',
    agent_name: agent?.agent_name ?? '',
    provider: agent?.provider ?? providers[0]?.provider ?? '',
    model: agent?.model ?? '',
    language: agent?.language ?? LANGUAGES[0].value,
    system_prompt: agent?.system_prompt ?? '',
    security_key: '',
    status: agent?.status ?? AGENT_STATUSES[0],
  })

  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const models = useMemo(
    () => providers.find((entry) => entry.provider === form.provider)?.models ?? [],
    [providers, form.provider],
  )

  // The API rejects a model that does not belong to the chosen provider, so
  // the model must follow the provider rather than linger from the old one.
  useEffect(() => {
    setForm((previous) =>
      models.includes(previous.model)
        ? previous
        : { ...previous, model: models[0] ?? '' },
    )
  }, [models])

  const update = (key) => (event) =>
    setForm((previous) => ({ ...previous, [key]: event.target.value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const payload = isEdit
      ? {
          agent_name: form.agent_name.trim(),
          model: form.model,
          language: form.language,
          system_prompt: form.system_prompt,
          status: form.status,
        }
      : {
          organization_id: Number(form.organization_id),
          agent_name: form.agent_name.trim(),
          provider: form.provider,
          model: form.model,
          language: form.language,
          system_prompt: form.system_prompt,
          security_key: form.security_key,
          status: form.status,
        }

    if (isEdit && form.security_key.trim()) {
      payload.security_key = form.security_key
    }

    setSubmitting(true)

    try {
      await onSubmit(payload)
    } catch (err) {
      setError(errorMessage(err, 'Could not save the agent.'))
      setSubmitting(false)
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="field-row">
        <label className="field">
          <span>Organization *</span>

          {organizations.length > 0 ? (
            <select
              value={form.organization_id}
              onChange={update('organization_id')}
              disabled={isEdit || fixedOrganizationId != null}
              required
            >
              <option value="">Select…</option>
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="number"
              value={form.organization_id}
              onChange={update('organization_id')}
              disabled={isEdit || fixedOrganizationId != null}
              required
            />
          )}
        </label>

        <label className="field">
          <span>Agent name *</span>
          <input
            value={form.agent_name}
            onChange={update('agent_name')}
            maxLength={150}
            required
          />
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span>Provider *</span>
          <select
            value={form.provider}
            onChange={update('provider')}
            disabled={isEdit}
            required
          >
            {providers.map((entry) => (
              <option key={entry.provider} value={entry.provider}>
                {entry.provider}
              </option>
            ))}
          </select>
          {isEdit && (
            <span className="hint">
              Provider is the routing key and cannot be changed.
            </span>
          )}
        </label>

        <label className="field">
          <span>Model *</span>
          <select value={form.model} onChange={update('model')} required>
            {models.length === 0 && <option value="">No models</option>}
            {models.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span>Language *</span>
          <select value={form.language} onChange={update('language')} required>
            {LANGUAGES.map((language) => (
              <option key={language.value} value={language.value}>
                {language.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Status *</span>
          <select value={form.status} onChange={update('status')} required>
            {AGENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="field">
        <span>
          {isEdit ? 'API key (leave blank to keep the current one)' : 'API key *'}
        </span>
        <input
          type="password"
          value={form.security_key}
          onChange={update('security_key')}
          autoComplete="off"
          placeholder={isEdit && agent?.has_security_key ? '•••••••• configured' : ''}
          required={!isEdit}
        />
        <span className="hint">
          The key is never returned by the API, so it cannot be shown back here.
        </span>
      </label>

      <label className="field">
        <span>System prompt *</span>
        <textarea
          rows={7}
          value={form.system_prompt}
          onChange={update('system_prompt')}
          placeholder="Instructions the analysis model follows when scoring calls…"
          required
        />
      </label>

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create agent'}
        </button>
      </div>
    </form>
  )
}
