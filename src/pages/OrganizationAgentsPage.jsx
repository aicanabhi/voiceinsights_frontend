import { useCallback, useEffect, useMemo, useState } from 'react'

import { errorMessage } from '../api/client'
import {
  createAgent,
  deleteAgent,
  listAgentsForOrganization,
  listAllAgents,
  updateAgent,
} from '../api/organizationAgents'
import { listOrganizations } from '../api/organizations'
import { LANGUAGES, listProviders } from '../api/providers'
import Modal from '../components/Modal'
import OrganizationAgentForm from '../components/OrganizationAgentForm'
import { ROLES, useAuth } from '../context/AuthContext'

function languageLabel(value) {
  return LANGUAGES.find((language) => language.value === value)?.label ?? value
}

export default function OrganizationAgentsPage() {
  const { user, hasRole } = useAuth()
  const isSuperAdmin = hasRole(ROLES.SUPER_ADMIN)

  const [agents, setAgents] = useState([])
  const [providers, setProviders] = useState([])
  const [organizations, setOrganizations] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      // Listing every agent is super-admin only; an org admin reads its own
      // organization's agents through the scoped route.
      const agentsPromise = isSuperAdmin
        ? listAllAgents()
        : user?.organization_id != null
          ? listAgentsForOrganization(user.organization_id)
          : Promise.resolve([])

      const [agentRows, providerRows] = await Promise.all([
        agentsPromise,
        listProviders(),
      ])

      setAgents(agentRows)
      setProviders(providerRows)

      if (isSuperAdmin) {
        setOrganizations(await listOrganizations())
      }
    } catch (err) {
      setError(errorMessage(err, 'Could not load agents.'))
    } finally {
      setLoading(false)
    }
  }, [isSuperAdmin, user?.organization_id])

  useEffect(() => {
    load()
  }, [load])

  const organizationName = useCallback(
    (id) => organizations.find((organization) => organization.id === id)?.name ?? `#${id}`,
    [organizations],
  )

  /**
   * Coverage per provider. Uploads fail with 400 when the organization has no
   * agent for the chosen provider, so the gap is worth showing.
   *
   * "Configured" only means something for a single organization. A super admin
   * is looking at every organization at once, so that view reports how many
   * organizations have an agent for the provider instead of a yes/no.
   */
  const coverage = useMemo(() => {
    const byProvider = {}

    for (const agent of agents) {
      byProvider[agent.provider] ??= new Set()
      byProvider[agent.provider].add(agent.organization_id)
    }

    return byProvider
  }, [agents])

  const handleCreate = async (payload) => {
    const created = await createAgent(payload)

    setAgents((previous) => [...previous, created])
    setCreating(false)
    setNotice(`Created “${created.agent_name}” for ${created.provider}.`)
  }

  const handleUpdate = async (payload) => {
    const updated = await updateAgent(editing.organization_id, editing.provider, payload)

    setAgents((previous) =>
      previous.map((agent) =>
        agent.organization_id === updated.organization_id &&
        agent.provider === updated.provider
          ? updated
          : agent,
      ),
    )

    setEditing(null)
    setNotice(`Updated “${updated.agent_name}”.`)
  }

  const handleDelete = async () => {
    setDeleting(true)
    setError('')

    try {
      await deleteAgent(confirmDelete.organization_id, confirmDelete.provider)

      setAgents((previous) =>
        previous.filter(
          (agent) =>
            !(
              agent.organization_id === confirmDelete.organization_id &&
              agent.provider === confirmDelete.provider
            ),
        ),
      )

      setNotice(`Deleted the ${confirmDelete.provider} agent.`)
      setConfirmDelete(null)
    } catch (err) {
      setError(errorMessage(err, 'Could not delete the agent.'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Organization agents</h1>
          <p className="muted">
            One agent per organization and provider. Uploads read the model,
            language and key from here.
          </p>
        </div>

        {isSuperAdmin && (
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            New agent
          </button>
        )}
      </header>

      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-success">{notice}</div>}

      {!isSuperAdmin && (
        <div className="alert alert-info">
          Agents are read-only for your role. Ask a super admin to add or change
          one.
        </div>
      )}

      {providers.length > 0 && (
        <div className="card section">
          <h2>Providers &amp; models</h2>
          <p className="muted">
            The models each provider accepts. A provider with no agent cannot be
            picked when uploading.
          </p>

          <div className="provider-grid">
            {providers.map((entry) => {
              const orgCount = coverage[entry.provider]?.size ?? 0

              return (
                <div className="provider-card" key={entry.provider}>
                  <div className="provider-head">
                    <strong>{entry.provider}</strong>

                    <span className={orgCount > 0 ? 'pill pill-active' : 'pill pill-muted'}>
                      {isSuperAdmin
                        ? `${orgCount} org${orgCount === 1 ? '' : 's'}`
                        : orgCount > 0
                          ? 'Configured'
                          : 'Not configured'}
                    </span>
                  </div>

                  <ul className="model-list">
                    {entry.models.map((model) => (
                      <li key={model}>{model}</li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : agents.length === 0 ? (
          <div className="empty-state">
            <h2>No agents configured</h2>
            <p className="muted">
              {isSuperAdmin
                ? 'Create one so recordings can be transcribed and analysed.'
                : 'Your organization has no agent yet, so uploads will be rejected.'}
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Agent</th>
                  {isSuperAdmin && <th>Organization</th>}
                  <th>Provider</th>
                  <th>Model</th>
                  <th>Language</th>
                  <th>API key</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>

              <tbody>
                {agents.map((agent) => (
                  <tr key={agent.id}>
                    <td className="strong">
                      {agent.agent_name}
                      <div className="row-sub" title={agent.system_prompt}>
                        {agent.system_prompt}
                      </div>
                    </td>

                    {isSuperAdmin && <td>{organizationName(agent.organization_id)}</td>}

                    <td>{agent.provider}</td>
                    <td>{agent.model}</td>
                    <td>{languageLabel(agent.language)}</td>
                    <td>
                      <span className={agent.has_security_key ? 'pill pill-active' : 'pill pill-danger'}>
                        {agent.has_security_key ? 'Set' : 'Missing'}
                      </span>
                    </td>
                    <td>
                      <span className={agent.status === 'ACTIVE' ? 'pill pill-active' : 'pill pill-muted'}>
                        {agent.status}
                      </span>
                    </td>
                    <td className="row-actions">
                      {isSuperAdmin && (
                        <>
                          <button
                            type="button"
                            className="btn btn-small"
                            onClick={() => setEditing(agent)}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="btn btn-small btn-danger"
                            onClick={() => setConfirmDelete(agent)}
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
        <Modal title="New agent" onClose={() => setCreating(false)}>
          <OrganizationAgentForm
            providers={providers}
            organizations={organizations}
            fixedOrganizationId={isSuperAdmin ? null : user?.organization_id}
            onSubmit={handleCreate}
            onCancel={() => setCreating(false)}
          />
        </Modal>
      )}

      {editing && (
        <Modal title={`Edit ${editing.agent_name}`} onClose={() => setEditing(null)}>
          <OrganizationAgentForm
            agent={editing}
            providers={providers}
            organizations={organizations}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Delete agent" onClose={() => setConfirmDelete(null)}>
          <p>
            Delete the <strong>{confirmDelete.provider}</strong> agent for{' '}
            <strong>{organizationName(confirmDelete.organization_id)}</strong>?
            Uploads using that provider will be rejected until another one is
            created.
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
