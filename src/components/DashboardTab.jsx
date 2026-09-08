import { useEffect, useState, useCallback } from 'react'
import { Row, Col, Card, List, Typography, Tag, Empty, Spin, Table } from 'antd'
import { TrophyOutlined, ClockCircleOutlined, CrownOutlined } from '@ant-design/icons'
import { supabase } from '../lib/supabaseClient'

const { Title, Text } = Typography

const TOP_N = 5

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
        <Title level={2} style={{ marginBottom: '8px' }}>Summer Showdown Leaderboard</Title>
        <Text type="secondary">Track team performance across all games</Text>
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
              <Card style={{ height: '700px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <Title level={3} style={{ marginBottom: '4px' }}>{game.name}</Title>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Game Leaderboard</Text>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  {podiumTeams.length > 0 ? (
                    <>
                      {podiumTeams[0] ? (
                        <div style={{
                          backgroundColor: gameColor.bg,
                          borderLeft: `4px solid ${gameColor.border}`,
                          padding: '16px 20px',
                          borderRadius: '8px',
                          marginBottom: '16px',
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: '12px',
                          flexWrap: 'wrap',
                          minHeight: '60px'
                        }}>
                          <div style={{ fontSize: '32px', order: 1 }}>🥇</div>
                          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#000', flex: '1 1 auto', minWidth: '150px', order: 2 }}>
                            {podiumTeams[0].team_name}
                          </div>
                          <div style={{ fontSize: '20px', color: '#000', fontWeight: '600', order: 3, marginLeft: 'auto' }}>
                            {formatTime(podiumTeams[0].completion_time)}
                          </div>
                        </div>
                      ) : (
                        <div style={{
                          backgroundColor: '#f5f5f5',
                          padding: '16px 20px',
                          borderRadius: '8px',
                          marginBottom: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          height: '60px'
                        }}>
                          <Text style={{ fontSize: '16px', color: '#999' }}>No winner yet</Text>
                        </div>
                      )}

                    </>
                  ) : (
                    <div style={{
                      backgroundColor: '#f5f5f5',
                      padding: '16px 20px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Text style={{ fontSize: '16px', color: '#999' }}>No winner yet</Text>
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <Title level={5} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', marginTop: '12px', margin: '12px 0 16px 0' }}>
                    <ClockCircleOutlined /> Waiting ({nextTurn.length})
                  </Title>
                  {nextTurn.length === 0 ? (
                    <Text type="secondary" style={{ fontSize: '12px' }}>No teams waiting</Text>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflow: 'auto' }}>
                      {nextTurn.map((t, i) => (
                        <div key={t.team_id} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 12px',
                          backgroundColor: t.status === 'in_progress' ? '#e6f7ff' : '#fafafa',
                          borderRadius: '6px',
                          borderLeft: t.status === 'in_progress' ? '3px solid #1890ff' : 'none'
                        }}>
                          <span style={{ fontSize: '13px', fontWeight: '500' }}>{t.team_name}</span>
                          <Tag color={t.status === 'in_progress' ? 'processing' : 'default'} style={{ fontSize: '11px' }}>
                            {t.status === 'in_progress' ? 'Running' : 'Waiting'}
                          </Tag>
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
