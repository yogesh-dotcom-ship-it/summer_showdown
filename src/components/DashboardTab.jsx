import { useEffect, useState, useCallback } from 'react'
import { Row, Col, Card, List, Typography, Tag, Empty, Spin } from 'antd'
import { TrophyOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { supabase } from '../lib/supabaseClient'

const { Title, Text } = Typography

const TOP_N = 5

function formatTime(seconds) {
  if (seconds == null) return '--'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
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
    <Row gutter={[16, 16]}>
      {games.map((game) => {
        const gameTeams = teams.filter((t) => t.game_name === game.name)
        const leastTime = gameTeams
          .filter((t) => t.status === 'completed' && t.completion_time != null)
          .sort((a, b) => a.completion_time - b.completion_time)
          .slice(0, TOP_N)
        const nextTurn = gameTeams
          .filter((t) => t.status !== 'completed')
          .sort((a, b) => new Date(a.queued_at) - new Date(b.queued_at))
          .slice(0, TOP_N)

        return (
          <Col xs={24} md={12} lg={8} key={game.name}>
            <Card title={game.name} style={{ height: '100%' }}>
              <Title level={5}>
                <TrophyOutlined /> Least Time
              </Title>
              <List
                size="small"
                dataSource={leastTime}
                locale={{ emptyText: 'No completed teams yet' }}
                renderItem={(t, i) => (
                  <List.Item>
                    <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
                      <span><Text strong>{i + 1}.</Text> {t.team_name}</span>
                      <Text type="secondary">{formatTime(t.completion_time)}</Text>
                    </div>
                  </List.Item>
                )}
                style={{ marginBottom: 20 }}
              />

              <Title level={5}>
                <ClockCircleOutlined /> Next Turn
              </Title>
              <List
                size="small"
                dataSource={nextTurn}
                locale={{ emptyText: 'No teams waiting' }}
                renderItem={(t) => (
                  <List.Item>
                    <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
                      <span>{t.team_name}</span>
                      {t.status === 'in_progress' && <Tag color="processing">Now Running</Tag>}
                    </div>
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        )
      })}
    </Row>
  )
}
