// Employee IDs are deliberately not stored (company legal policy), so the
// export carries only team name, game, completion time, and status.
export function generateTeamCSV(teams) {
  const headers = ['Team Name', 'Game Name', 'Completion Time', 'Status']

  const rows = teams.map(team => [
    team.team_name || '',
    team.game_name || '',
    team.completion_time || '',
    team.status || ''
  ])

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  return csv
}

export function downloadCSV(csv, filename = 'teams_export.csv') {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
