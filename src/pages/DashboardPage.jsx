import { useCallback, useEffect, useMemo, useState } from 'react'

import { errorMessage } from '../api/client'
import { defaultScopeFor, fetchScope, scopeHeading } from '../api/dashboard'
import { listOrganizations } from '../api/organizations'
import { listUsers } from '../api/users'
import BarRows from '../components/charts/BarRows'
import StackedBar from '../components/charts/StackedBar'
import { ROLES, useAuth } from '../context/AuthContext'
import { formatNumber } from '../lib/format'
import { SCORE_COLOR, SENTIMENT_COLORS, STATUS_COLORS } from '../lib/vizColors'

function StatTile({ label, value, hint }) {
  return (
    <div className="tile">
      <div className="tile-label">{label}</div>
      <div className="tile-value">{value}</div>
      {hint && <div className="tile-hint">{hint}</div>}
    </div>
  )
}

export default function DashboardPage() {
  const { user, hasRole } = useAuth()

  const fallbackScope = useMemo(() => defaultScopeFor(user), [user])

  const [scope, setScope] = useState(fallbackScope)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Drill-down targets. Both lists are already role-scoped by the API, so
  // whatever comes back is something this user is allowed to open.
  const [organizations, setOrganizations] = useState([])
  const [people, setPeople] = useState([])

  useEffect(() => {
    let cancelled = false

    listUsers()
      .then((rows) => !cancelled && setPeople(rows))
      .catch(() => {})

    if (hasRole(ROLES.SUPER_ADMIN)) {
      listOrganizations()
        .then((rows) => !cancelled && setOrganizations(rows))
        .catch(() => {})
    }

    return () => {
      cancelled = true
    }
  }, [hasRole])

  const load = useCallback(async () => {
    if (!scope) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      setData(await fetchScope(scope))
    } catch (err) {
      setError(errorMessage(err, 'Could not load the dashboard.'))
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [scope])

  useEffect(() => {
    load()
  }, [load])

  const handleScopeChange = (event) => {
    const [type, id] = event.target.value.split(':')
    setScope(type === 'platform' ? { type, label: 'Platform' } : { type, id: Number(id), label: '' })
  }

  if (!scope) {
    return (
      <div className="page">
        <h1>Dashboard</h1>
        <div className="alert alert-error">
          Your account is not linked to an organization or team, so there is no
          dashboard to show. Ask an admin to set your scope.
        </div>
      </div>
    )
  }

  const scopeValue = scope.type === 'platform' ? 'platform' : `${scope.type}:${scope.id}`

  /**
   * Only AGENT rows belong here. get_agent_dashboard rejects any other role
   * with a 400 ("This dashboard is only for agents"), so offering a team lead
   * or org admin would hand the user a guaranteed error.
   *
   * Anyone already offered above is skipped too -- an agent's own row would
   * otherwise appear twice, once as "My calls" and once here.
   */
  const drilldownPeople = people.filter(
    (person) =>
      person.role === ROLES.AGENT &&
      !(fallbackScope?.type === 'agent' && person.id === fallbackScope.id),
  )

  const statusRows = data
    ? [
        { label: 'Completed', value: data.completed_calls, color: STATUS_COLORS.COMPLETED },
        { label: 'Processing', value: data.processing_calls, color: STATUS_COLORS.PROCESSING },
        { label: 'Pending', value: data.pending_calls, color: STATUS_COLORS.PENDING },
        { label: 'Failed', value: data.failed_calls, color: STATUS_COLORS.FAILED },
      ]
    : []

  const sentimentSegments = data
    ? [
        { label: 'Positive', value: data.positive_calls, color: SENTIMENT_COLORS.Positive },
        { label: 'Neutral', value: data.neutral_calls, color: SENTIMENT_COLORS.Neutral },
        { label: 'Negative', value: data.negative_calls, color: SENTIMENT_COLORS.Negative },
        { label: 'Other', value: data.other_sentiment_calls, color: SENTIMENT_COLORS.Other },
      ]
    : []

  // Scores are on a 0-10 scale, so the bar is the score out of 10.
  const scoreRows = data
    ? [
        { label: 'Overall', value: data.average_score },
        { label: 'Compliance', value: data.average_compliance },
        { label: 'Professionalism', value: data.average_professionalism },
        { label: 'Empathy', value: data.average_empathy },
      ]
    : []

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">{scopeHeading(scope, data)}</p>
        </div>

        <div className="filter-bar">
          <select value={scopeValue} onChange={handleScopeChange}>
            {hasRole(ROLES.SUPER_ADMIN) && <option value="platform">Platform</option>}

            {fallbackScope && fallbackScope.type !== 'platform' && (
              <option value={`${fallbackScope.type}:${fallbackScope.id}`}>
                {fallbackScope.label}
              </option>
            )}

            {organizations.length > 0 && (
              <optgroup label="Organizations">
                {organizations.map((organization) => (
                  <option key={organization.id} value={`organization:${organization.id}`}>
                    {organization.name}
                  </option>
                ))}
              </optgroup>
            )}

            {/* Skip anyone already offered above -- an agent's own row would
                otherwise appear twice, once as "My calls" and once here. */}
            {drilldownPeople.length > 0 && (
              <optgroup label="Agents">
                {drilldownPeople.map((person) => (
                  <option key={person.id} value={`agent:${person.id}`}>
                    {person.full_name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>

          <button type="button" className="btn btn-small" onClick={load}>
            Refresh
          </button>
        </div>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="card empty-state">Loading…</div>
      ) : !data ? null : (
        <>
          <div className="tile-grid">
            {data.organizations != null && (
              <StatTile label="Organizations" value={data.organizations} />
            )}
            {data.teams != null && <StatTile label="Teams" value={data.teams} />}
            {data.users != null && <StatTile label="Users" value={data.users} />}
            {data.agents != null && <StatTile label="Agents" value={data.agents} />}

            <StatTile label="Calls uploaded" value={data.uploaded_calls} />
            <StatTile
              label="Analysed"
              value={data.completed_analysis}
              hint={
                data.uploaded_calls > 0
                  ? `${Math.round((data.completed_analysis / data.uploaded_calls) * 100)}% of uploads`
                  : undefined
              }
            />
            <StatTile
              label="Average score"
              value={formatNumber(data.average_score)}
              hint="out of 10"
            />
          </div>

          <div className="split">
            <div className="card section">
              <h2>Calls by status</h2>
              <BarRows rows={statusRows} total={data.uploaded_calls} />
            </div>

            <div className="card section">
              <h2>Sentiment</h2>
              <StackedBar
                segments={sentimentSegments}
                emptyLabel="No analysed calls yet."
              />
            </div>
          </div>

          <div className="card section">
            <h2>Average scores</h2>

            {data.completed_analysis === 0 ? (
              <p className="muted">No analysed calls yet.</p>
            ) : (
              <div className="bar-rows">
                {scoreRows.map((row) => (
                  <div className="bar-row" key={row.label}>
                    <div className="bar-row-head">
                      <span className="bar-row-label">{row.label}</span>
                      <span className="bar-row-value">{formatNumber(row.value)} / 10</span>
                    </div>

                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${Math.min(100, Math.max(0, (row.value / 10) * 100))}%`,
                          background: SCORE_COLOR,
                        }}
                        role="img"
                        aria-label={`${row.label}: ${formatNumber(row.value)} out of 10`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
