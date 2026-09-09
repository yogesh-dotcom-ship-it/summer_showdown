export function generateTeamCSV(teams, members) {
  const headers = ['Team Name', 'Player-01', 'Player-02', 'Player-03', 'Player-04', 'Completion Time', 'Game Name']

  const rows = teams.map(team => {
    const teamMembers = members.filter(m => m.team_id === team.team_id)
    const eids = ['', '', '', '']
    teamMembers.forEach((m, idx) => {
      if (idx < 4) eids[idx] = m.eid
    })

    return [
      team.team_name || '',
      eids[0] || '',
      eids[1] || '',
      eids[2] || '',
      eids[3] || '',
      team.completion_time || '',
      team.game_name || ''
    ]
  })

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
