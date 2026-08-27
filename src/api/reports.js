import client from './client'

export async function getOverallReport(
  startDate,
  endDate,
  organizationId = null,
  teamId = null,
  callingAgentId = null,
) {
  const params = {
    start_date: startDate,
    end_date: endDate,
  }

  if (organizationId != null) {
    params.organization_id = organizationId
  }

  if (teamId != null) {
    params.team_id = teamId
  }

  if (callingAgentId != null) {
    params.calling_agent_id = callingAgentId
  }

  const { data } = await client.get('/reports/overall', {
    params,
  })

  return data
}

export async function getOverallReportPdf(
  startDate,
  endDate,
  organizationId = null,
  teamId = null,
  callingAgentId = null,
) {
  const params = {
    start_date: startDate,
    end_date: endDate,
  }

  if (organizationId != null) {
    params.organization_id = organizationId
  }

  if (teamId != null) {
    params.team_id = teamId
  }

  if (callingAgentId != null) {
    params.calling_agent_id = callingAgentId
  }

  const response = await client.get('/reports/overall/pdf', {
    params,
    responseType: 'blob',
  })

  return response.data
}