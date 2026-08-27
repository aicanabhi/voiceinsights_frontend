import { useEffect, useState } from 'react'

import {
  getOverallReport,
  getOverallReportPdf,
} from '../api/reports'

import { listOrganizations } from '../api/organizations'
import { listTeams } from '../api/teams'
import { listUsers } from '../api/users'

import { useAuth } from '../context/AuthContext'

import { errorMessage } from '../api/client'


export default function ReportsPage() {
  const { user } = useAuth()

  // =========================================================
  // REPORT FILTERS
  // =========================================================

  const [startDate, setStartDate] = useState('2026-08-01')
  const [endDate, setEndDate] = useState('2026-08-13')

  const [organizationId, setOrganizationId] = useState('')
  const [teamId, setTeamId] = useState('')
  const [callingAgentId, setCallingAgentId] = useState('')

  const [organizations, setOrganizations] = useState([])
  const [teams, setTeams] = useState([])
  const [users, setUsers] = useState([])

  const [filterLoading, setFilterLoading] = useState(false)

  // =========================================================
  // REPORT STATE
  // =========================================================

  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [error, setError] = useState('')

  // =========================================================
  // LOAD FILTER DATA
  // =========================================================

  useEffect(() => {
    const loadFilters = async () => {
      try {
        setFilterLoading(true)
        setError('')

        // Users are already scoped by the backend according
        // to the logged-in user's role.
        const usersData = await listUsers()

        setUsers(usersData)

        // Only SUPER_ADMIN can choose organization.
        if (user?.role === 'SUPER_ADMIN') {
          const organizationsData =
            await listOrganizations()

          setOrganizations(organizationsData)
        }

        // TEAM_LEAD, ORG_ADMIN and SUPER_ADMIN can list teams.
        if (
          user?.role === 'SUPER_ADMIN' ||
          user?.role === 'ORG_ADMIN' ||
          user?.role === 'TEAM_LEAD'
        ) {
          const teamsData = await listTeams()

          setTeams(teamsData)
        }
      } catch (err) {
        setError(
          errorMessage(
            err,
            'Failed to load report filters.',
          ),
        )
      } finally {
        setFilterLoading(false)
      }
    }

    if (user) {
      loadFilters()
    }
  }, [user])

  // =========================================================
  // FILTER HELPERS
  // =========================================================

  const visibleTeams = teams.filter((team) => {
    if (!organizationId) {
      return true
    }

    return (
      Number(team.organization_id) ===
      Number(organizationId)
    )
  })

  const visibleAgents = users.filter((currentUser) => {
    // Only actual calling agents should appear.
    if (currentUser.role !== 'AGENT') {
      return false
    }

    // Organization filter.
    if (
      organizationId &&
      Number(currentUser.organization_id) !==
        Number(organizationId)
    ) {
      return false
    }

    // Team filter.
    if (
      teamId &&
      Number(currentUser.team_id) !==
        Number(teamId)
    ) {
      return false
    }

    return true
  })

  // =========================================================
  // LOAD JSON REPORT
  // =========================================================

  const loadReport = async () => {
    try {
      setLoading(true)
      setError('')

      const data = await getOverallReport(
        startDate,
        endDate,
        organizationId || null,
        teamId || null,
        callingAgentId || null,
      )

      setReport(data)
    } catch (err) {
      setError(
        errorMessage(
          err,
          'Failed to load report.',
        ),
      )
    } finally {
      setLoading(false)
    }
  }

  // =========================================================
  // OPEN PDF
  // =========================================================

  const openPdf = async () => {
    try {
      setPdfLoading(true)
      setError('')

      const blob = await getOverallReportPdf(
        startDate,
        endDate,
        organizationId || null,
        teamId || null,
        callingAgentId || null,
      )

      const pdfBlob = new Blob(
        [blob],
        {
          type: 'application/pdf',
        },
      )

      const pdfUrl =
        URL.createObjectURL(pdfBlob)

      window.open(
        pdfUrl,
        '_blank',
      )

      setTimeout(() => {
        URL.revokeObjectURL(pdfUrl)
      }, 60000)
    } catch (err) {
      setError(
        errorMessage(
          err,
          'Failed to generate PDF report.',
        ),
      )
    } finally {
      setPdfLoading(false)
    }
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="page">

      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <div className="page-header">
        <div>
          <h1>Reports</h1>

          <p>
            Calling agent performance and call quality analysis
          </p>
        </div>
      </div>

      {/* =====================================================
          REPORT FILTERS
      ===================================================== */}

      <div className="card">

        <h2>Report Filters</h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            alignItems: 'end',
          }}
        >

          {/* ORGANIZATION */}

          {user?.role === 'SUPER_ADMIN' && (
            <div>
              <label>Organization</label>

              <select
                value={organizationId}
                onChange={(e) => {
                  setOrganizationId(e.target.value)
                  setTeamId('')
                  setCallingAgentId('')
                }}
                disabled={filterLoading}
              >
                <option value="">
                  All Organizations
                </option>

                {organizations.map((organization) => (
                  <option
                    key={organization.id}
                    value={organization.id}
                  >
                    {organization.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* TEAM */}

          <div>
            <label>Team</label>

            <select
              value={teamId}
              onChange={(e) => {
                setTeamId(e.target.value)
                setCallingAgentId('')
              }}
              disabled={
                filterLoading ||
                !(
                  user?.role === 'SUPER_ADMIN' ||
                  user?.role === 'ORG_ADMIN' ||
                  user?.role === 'TEAM_LEAD'
                )
              }
            >
              <option value="">
                All Teams
              </option>

              {visibleTeams.map((team) => (
                <option
                  key={team.id}
                  value={team.id}
                >
                  {team.name}
                </option>
              ))}
            </select>
          </div>

          {/* CALLING AGENT */}

          <div>
            <label>Calling Agent</label>

            <select
              value={callingAgentId}
              onChange={(e) =>
                setCallingAgentId(e.target.value)
              }
              disabled={filterLoading}
            >
              <option value="">
                All Calling Agents
              </option>

              {visibleAgents.map((currentUser) => (
                <option
                  key={currentUser.id}
                  value={currentUser.id}
                >
                  {currentUser.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* START DATE */}

          <div>
            <label>Start Date</label>

            <input
              type="date"
              value={startDate}
              onChange={(e) =>
                setStartDate(e.target.value)
              }
            />
          </div>

          {/* END DATE */}

          <div>
            <label>End Date</label>

            <input
              type="date"
              value={endDate}
              onChange={(e) =>
                setEndDate(e.target.value)
              }
            />
          </div>

          {/* VIEW REPORT */}

          <button
            type="button"
            className="btn btn-primary"
            onClick={loadReport}
            disabled={loading}
          >
            {loading
              ? 'Loading...'
              : 'View Report'}
          </button>

          {/* VIEW PDF */}

          <button
            type="button"
            className="btn"
            onClick={openPdf}
            disabled={pdfLoading}
          >
            {pdfLoading
              ? 'Generating...'
              : 'View PDF'}
          </button>

        </div>

        {error && (
          <div
            style={{
              marginTop: '16px',
              color: '#b91c1c',
            }}
          >
            {error}
          </div>
        )}

      </div>

      {/* =====================================================
          REPORT CONTENT
      ===================================================== */}

      {report && (
        <>

          {/* =================================================
              REPORT INFORMATION
          ================================================= */}

          <div className="card">

            <h2>Report Information</h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px',
              }}
            >

              <MetricCard
                title="Organization"
                value={
                  report.organization?.name ??
                  'All Organizations'
                }
              />

              <MetricCard
                title="Team"
                value={
                  report.team?.name ??
                  'All Teams'
                }
              />

              <MetricCard
                title="Report Period"
                value={`${report.report_period?.start_date ?? startDate} → ${
                  report.report_period?.end_date ?? endDate
                }`}
              />

              <MetricCard
                title="Report Type"
                value="Calling Agent Performance"
              />

            </div>

          </div>

          {/* =================================================
              EXECUTIVE SUMMARY
          ================================================= */}

          <div className="card">

            <h2>Executive Summary</h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '16px',
              }}
            >

              <MetricCard
                title="Total Calls"
                value={
                  report.summary?.total_calls ?? 0
                }
              />

              <MetricCard
                title="Analyzed Calls"
                value={
                  report.summary?.analyzed_calls ?? 0
                }
              />

              <MetricCard
                title="Overall Score"
                value={
                  report.summary
                    ?.average_overall_score ?? '-'
                }
              />

              <MetricCard
                title="Compliance"
                value={
                  report.summary
                    ?.average_compliance ?? '-'
                }
              />

              <MetricCard
                title="Professionalism"
                value={
                  report.summary
                    ?.average_professionalism ?? '-'
                }
              />

              <MetricCard
                title="Empathy"
                value={
                  report.summary
                    ?.average_empathy ?? '-'
                }
              />

            </div>

          </div>

          {/* =================================================
              SENTIMENT ANALYSIS
          ================================================= */}

          <div className="card">

            <h2>Sentiment Analysis</h2>

            <table>

              <thead>
                <tr>
                  <th>Sentiment</th>
                  <th>Calls</th>
                </tr>
              </thead>

              <tbody>

                <tr>
                  <td>Positive</td>
                  <td>
                    {report.sentiment?.positive ?? 0}
                  </td>
                </tr>

                <tr>
                  <td>Neutral</td>
                  <td>
                    {report.sentiment?.neutral ?? 0}
                  </td>
                </tr>

                <tr>
                  <td>Negative</td>
                  <td>
                    {report.sentiment?.negative ?? 0}
                  </td>
                </tr>

                <tr>
                  <td>Other</td>
                  <td>
                    {report.sentiment?.other ?? 0}
                  </td>
                </tr>

              </tbody>

            </table>

          </div>

          {/* =================================================
              RULE COMPLIANCE
          ================================================= */}

          <div className="card">

            <h2>Rule Compliance</h2>

            <table>

              <thead>
                <tr>
                  <th>Rule</th>
                  <th>Followed</th>
                  <th>Not Followed</th>
                  <th>Compliance Rate</th>
                </tr>
              </thead>

              <tbody>

                <tr>
                  <td>Greeting</td>

                  <td>
                    {report.rules
                      ?.greeting_followed ?? 0}
                  </td>

                  <td>
                    {report.rules
                      ?.greeting_not_followed ?? 0}
                  </td>

                  <td>
                    {calculateRulePercentage(
                      report.rules
                        ?.greeting_followed,
                      report.rules
                        ?.greeting_not_followed,
                    )}
                  </td>
                </tr>

                <tr>
                  <td>Closing</td>

                  <td>
                    {report.rules
                      ?.closing_followed ?? 0}
                  </td>

                  <td>
                    {report.rules
                      ?.closing_not_followed ?? 0}
                  </td>

                  <td>
                    {calculateRulePercentage(
                      report.rules
                        ?.closing_followed,
                      report.rules
                        ?.closing_not_followed,
                    )}
                  </td>
                </tr>

              </tbody>

            </table>

          </div>

          {/* =================================================
              DAILY PERFORMANCE
          ================================================= */}

          <div className="card">

            <h2>Daily Performance</h2>

            <table>

              <thead>
                <tr>
                  <th>Date</th>
                  <th>Calls</th>
                  <th>Overall</th>
                  <th>Compliance</th>
                  <th>Professionalism</th>
                  <th>Empathy</th>
                  <th>Violations</th>
                </tr>
              </thead>

              <tbody>

                {(report.daily_performance || [])
                  .map((row) => (
                    <tr key={row.date}>

                      <td>{row.date}</td>

                      <td>{row.calls}</td>

                      <td>
                        {row.average_overall_score}
                      </td>

                      <td>
                        {row.average_compliance}
                      </td>

                      <td>
                        {row.average_professionalism}
                      </td>

                      <td>
                        {row.average_empathy}
                      </td>

                      <td>
                        {row.violations}
                      </td>

                    </tr>
                  ))}

                {(!report.daily_performance ||
                  report.daily_performance.length === 0) && (
                  <tr>
                    <td colSpan="7">
                      No daily performance data available.
                    </td>
                  </tr>
                )}

              </tbody>

            </table>

          </div>

          {/* =================================================
              CALLING AGENT PERFORMANCE
          ================================================= */}

          <div className="card">

            <h2>Calling Agent Performance</h2>

            <p
              style={{
                color: '#6b7280',
                fontSize: '13px',
                marginTop: '-8px',
                marginBottom: '16px',
              }}
            >
              Performance of agents who handled calls
              during the selected period.
            </p>

            <table>

              <thead>

                <tr>
                  <th>Agent</th>
                  <th>Organization</th>
                  <th>Team</th>
                  <th>Calls</th>
                  <th>Overall</th>
                  <th>Compliance</th>
                  <th>Professionalism</th>
                  <th>Empathy</th>
                  <th>Violations</th>
                </tr>

              </thead>

              <tbody>

                {(report.agent_performance || [])
                  .map((agent) => (
                    <tr key={agent.agent_id}>

                      <td>
                        <strong>
                          {agent.agent_name}
                        </strong>
                      </td>

                      <td>
                        {agent.organization_name ?? '-'}
                      </td>

                      <td>
                        {agent.team_name ?? '-'}
                      </td>

                      <td>
                        {agent.calls}
                      </td>

                      <td>
                        {agent.average_overall_score}
                      </td>

                      <td>
                        {agent.average_compliance}
                      </td>

                      <td>
                        {agent.average_professionalism}
                      </td>

                      <td>
                        {agent.average_empathy}
                      </td>

                      <td>
                        {agent.violations}
                      </td>

                    </tr>
                  ))}

                {(!report.agent_performance ||
                  report.agent_performance.length === 0) && (
                  <tr>
                    <td colSpan="9">
                      No calling agent data available
                      for this period.
                    </td>
                  </tr>
                )}

              </tbody>

            </table>

          </div>

          {/* =================================================
              TOP VIOLATIONS
          ================================================= */}

          <div className="card">

            <h2>Top Violations</h2>

            <table>

              <thead>
                <tr>
                  <th>Violation</th>
                  <th>Count</th>
                </tr>
              </thead>

              <tbody>

                {(report.violations || [])
                  .map((item, index) => (
                    <tr key={index}>

                      <td>
                        {item.violation}
                      </td>

                      <td>
                        {item.count}
                      </td>

                    </tr>
                  ))}

                {(!report.violations ||
                  report.violations.length === 0) && (
                  <tr>
                    <td>
                      No violations found
                    </td>

                    <td>0</td>
                  </tr>
                )}

              </tbody>

            </table>

          </div>

        </>
      )}

    </div>
  )
}


/* =========================================================
   METRIC CARD
========================================================= */

function MetricCard({ title, value }) {
  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '10px',
        padding: '16px',
      }}
    >

      <div
        style={{
          fontSize: '13px',
          color: '#6b7280',
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: '24px',
          fontWeight: 700,
          marginTop: '6px',
        }}
      >
        {value}
      </div>

    </div>
  )
}


/* =========================================================
   RULE PERCENTAGE
========================================================= */

function calculateRulePercentage(
  followed,
  notFollowed,
) {
  const followedCount =
    Number(followed || 0)

  const notFollowedCount =
    Number(notFollowed || 0)

  const total =
    followedCount +
    notFollowedCount

  if (total === 0) {
    return '0%'
  }

  return `${(
    (followedCount / total) *
    100
  ).toFixed(1)}%`
}