import { useEffect, useState, useCallback } from 'react'
import { Row, Col, Card, Typography, Empty, Spin } from 'antd'
import { supabase } from '../lib/supabaseClient'

const { Title, Text } = Typography

const GAME_COLORS = [
  { bg: '#fffbe6', border: '#faad14' }, // Yellow
  { bg: '#fff7e6', border: '#ff7a45' }, // Orange
  { bg: '#f6ffed', border: '#52c41a' }, // Green
  { bg: '#e6f7ff', border: '#1890ff' }, // Blue
  { bg: '#f9f0ff', border: '#722ed1' }, // Purple
  { bg: '#fff1f0', border: '#ff4d4f' }, // Red
]

function getGameColor(index) {
  return GAME_COLORS[index % GAME_COLORS.length]
}

function parseTimeString(timeStr) {
  if (typeof timeStr !== 'string') return timeStr
  const parts = timeStr.split(':')
  if (parts.length === 3) {
    const minutes = parseInt(parts[0], 10)
    const seconds = parseInt(parts[1], 10)
    const milliseconds = parseInt(parts[2], 10)
    return minutes * 60000 + seconds * 1000 + milliseconds
  }
  return 0
}

function formatTime(time) {
  if (time == null) return '--'
  if (typeof time === 'string') {
    return time
  }
  const totalMs = time
  const minutes = Math.floor(totalMs / 60000)
  const seconds = Math.floor((totalMs % 60000) / 1000)
  const milliseconds = totalMs % 1000
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(milliseconds).padStart(3, '0')}`
}

export default function DashboardTab() {
  const [games, setGames] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)

  const loadAll = useCallback(async () => {
    const [{ data: gamesData }, { data: teamsData }] = await Promise.all([
      supabase.from('ss_games').select('name').order('name', { ascending: true }),
      supabase
        .from('ss_teams')
        .select('team_id, team_name, game_name, status, completion_time, queued_at'),
    ])
    setGames(gamesData ?? [])
    setTeams(teamsData ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadAll()

    // Live updates: as teams get scanned and times get submitted elsewhere,
    // this dashboard reflects it without a manual refresh.
    const channel = supabase
      .channel('ss_teams_dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ss_teams' }, () => {
        loadAll()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadAll])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (games.length === 0) {
    return <Empty description="No games configured yet" />
  }

  return (
    <div style={{ padding: '0' }}>
      <div style={{ marginBottom: '32px' }}>
        <Title level={2} style={{ marginBottom: '8px' }}>Leaderboard</Title>
      </div>

      <Row gutter={[24, 24]}>
        {games.map((game, idx) => {
          const gameTeams = teams.filter((t) => t.game_name === game.name)

          // Get all completed teams and sort by completion time (least time = winner)
          const leastTime = gameTeams
            .filter((t) => t.status === 'completed' && t.completion_time != null)
            .sort((a, b) => {
              const timeA = typeof a.completion_time === 'string' ? parseTimeString(a.completion_time) : a.completion_time
              const timeB = typeof b.completion_time === 'string' ? parseTimeString(b.completion_time) : b.completion_time
              return timeA - timeB
            })

          // Get waiting/in-progress teams
          const nextTurn = gameTeams
            .filter((t) => t.status !== 'completed')
            .sort((a, b) => new Date(a.queued_at) - new Date(b.queued_at))
            .slice(0, 5)

          // The winner is the team with the least completion time
          const podiumTeams = leastTime.slice(0, 1)
          const gameColor = getGameColor(idx)

          return (
            <Col xs={24} md={12} lg={8} key={game.name}>
              <Card style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} styles={{ body: { padding: '16px' } }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{
                    width: 56,
                    height: 56,
                    borderRadius: '8px',
                    backgroundColor: gameColor.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    flexShrink: 0
                  }}>
                    🎮
                  </div>
                  <Title level={5} style={{ margin: 0 }}>{game.name}</Title>
                </div>

                <div style={{
                  backgroundColor: gameColor.bg,
                  borderRadius: '8px',
                  padding: '14px 16px',
                  marginBottom: '16px'
                }}>
                  <Text style={{ fontSize: '12px', color: '#8c8c8c', display: 'block', marginBottom: '8px' }}>Least time</Text>
                  {podiumTeams.length > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '18px' }}>🥇</span>
                      <span style={{ fontSize: '14px', fontWeight: 600, flex: 1 }}>{podiumTeams[0].team_name}</span>
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>{formatTime(podiumTeams[0].completion_time)}</span>
                    </div>
                  ) : (
                    <Text style={{ fontSize: '13px', color: '#8c8c8c' }}>No winner yet</Text>
                  )}
                </div>

                <div>
                  <Text style={{ fontSize: '12px', color: '#8c8c8c', display: 'block', marginBottom: '8px' }}>In Queue</Text>
                  {nextTurn.length === 0 ? (
                    <Text type="secondary" style={{ fontSize: '12px' }}>No teams in queue</Text>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {nextTurn.map((t, i) => (
                        <div key={t.team_id} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 0',
                          fontSize: '13px'
                        }}>
                          <span>{t.team_name}</span>
                          <span style={{ color: t.status === 'in_progress' ? '#1677ff' : (i === 0 ? '#fa8c16' : '#8c8c8c'), fontSize: '12px' }}>
                            {t.status === 'in_progress' ? 'Playing' : (i === 0 ? 'Next' : 'In queue')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </Col>
          )
        })}
      </Row>
    </div>
  )
}
