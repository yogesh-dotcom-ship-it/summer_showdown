import { useEffect, useState, useRef } from 'react'
import { Form, Input, Button, Card, Alert, Space, Typography } from 'antd'
import { QRCodeCanvas } from 'qrcode.react'
import { DownloadOutlined } from '@ant-design/icons'
import { supabase } from '../lib/supabaseClient'
import { generateTeamId } from '../utils/teamId'

const { Title, Text } = Typography

const GAME_COLORS = [
  { bg: '#fffbe6', border: '#faad14' }, // Yellow
  { bg: '#fff7e6', border: '#ff7a45' }, // Orange
  { bg: '#f6ffed', border: '#52c41a' }, // Green
  { bg: '#e6f7ff', border: '#1890ff' }, // Blue
  { bg: '#f9f0ff', border: '#722ed1' }, // Purple
  { bg: '#fff1f0', border: '#ff4d4f' }, // Red
]

function getGameColor(gameName, games) {
  const gameIndex = games.findIndex(g => g.name === gameName)
  return GAME_COLORS[gameIndex >= 0 ? gameIndex : 0]
}

const MAX_TEAM_ID_ATTEMPTS = 5

export default function RegistrationTab() {
  const [form] = Form.useForm()
  const [games, setGames] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [registeredTeam, setRegisteredTeam] = useState(null)
  const [selectedGame, setSelectedGame] = useState(null)
  const [step, setStep] = useState('gameSelection') // 'gameSelection' or 'teamRegistration'
  const qrRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('ss_games')
      .select('name')
      .order('name', { ascending: true })
      .then(({ data, error: gamesError }) => {
        if (cancelled) return
        if (gamesError) {
          setError('Could not load the game list. Check your Supabase connection.')
          return
        }
        setGames(data ?? [])
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleRegistrationSubmit(values) {
    setSubmitting(true)
    setError(null)

    const eids = [values.eid_1, values.eid_2, values.eid_3, values.eid_4]
      .filter((e) => e)
      .map((e) => e.trim())

    if (new Set(eids).size !== eids.length) {
      setError('The same Employee ID was entered more than once for this team.')
      setSubmitting(false)
      return
    }

    // Check each EID to see if they're already registered for THIS game
    for (const eid of eids) {
      const { data: memberData } = await supabase
        .from('ss_team_members')
        .select('team_id')
        .eq('eid', eid)

      if (memberData && memberData.length > 0) {
        // This EID exists, check which game(s) they're in
        const { data: teamsData } = await supabase
          .from('ss_teams')
          .select('game_name')
          .eq('team_id', memberData[0].team_id)

        if (teamsData && teamsData.length > 0) {
          const existingGame = teamsData[0].game_name
          if (existingGame === selectedGame) {
            // Same employee, same game - NOT allowed
            setError(`Employee ID ${eid} is already registered for ${selectedGame}.`)
            setSubmitting(false)
            return
          }
          // Different game - allowed, continue
        }
      }
    }

    let team = null
    for (let attempt = 0; attempt < MAX_TEAM_ID_ATTEMPTS && !team; attempt++) {
      const team_id = generateTeamId()
      const { data, error: insertError } = await supabase
        .from('ss_teams')
        .insert({ team_id, team_name: values.team_name.trim(), game_name: selectedGame })
        .select()
        .single()

      if (!insertError) {
        team = data
        break
      }
      if (insertError.code !== '23505') {
        setError(`Registration failed: ${insertError.message}`)
        setSubmitting(false)
        return
      }
    }

    if (!team) {
      setError('Could not generate a unique team code. Please try submitting again.')
      setSubmitting(false)
      return
    }

    const { error: membersError } = await supabase
      .from('ss_team_members')
      .insert(eids.map((eid) => ({ team_id: team.team_id, eid })))

    if (membersError) {
      await supabase.from('ss_teams').delete().eq('team_id', team.team_id)
      setError(
        membersError.code === '23505'
          ? 'One of these Employee IDs was just registered by someone else. Please check and try again.'
          : `Registration failed: ${membersError.message}`
      )
      setSubmitting(false)
      return
    }

    setRegisteredTeam({ team_id: team.team_id, team_name: team.team_name, game_name: selectedGame })
    setSubmitting(false)
    form.resetFields()
  }

  const handleDownloadQR = () => {
    const canvas = qrRef.current?.querySelector('canvas')
    if (canvas) {
      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/png')
      link.download = `${registeredTeam.team_name}_QR.png`
      link.click()
    }
  }

  if (registeredTeam) {
    const gameColor = getGameColor(registeredTeam.game_name, games)
    return (
      <Card style={{
        maxWidth: 600,
        margin: '0 auto',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        backgroundColor: gameColor.bg,
        padding: '40px 24px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: 24 }}>
            <span style={{ fontSize: '32px' }}>✅</span>
          </div>
          <Title level={2} style={{ marginBottom: 24 }}>
            Registration successful
          </Title>
          <div style={{ marginBottom: 32, fontSize: '16px' }}>
            <span>Show this QR code to : </span>
            <strong style={{ fontSize: '20px' }}>Table no. 01</strong>
          </div>
          <div style={{ marginBottom: 24, padding: '16px', backgroundColor: '#fff', borderRadius: '8px', display: 'inline-block' }}>
            <div ref={qrRef}>
              <QRCodeCanvas value={registeredTeam.team_id} size={240} includeMargin level="H" />
            </div>
          </div>
          <Space style={{ width: '100%', justifyContent: 'center', gap: '12px', flexDirection: 'row', marginTop: 32 }}>
            <Button
              onClick={() => {
                setRegisteredTeam(null)
                setStep('gameSelection')
                setSelectedGame(null)
              }}
              size="large"
              style={{ minWidth: '120px' }}
            >
              Close
            </Button>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleDownloadQR}
              size="large"
              style={{ minWidth: '120px' }}
            >
              Download QR
            </Button>
          </Space>
        </div>
      </Card>
    )
  }

  if (step === 'gameSelection') {
    return (
      <Card style={{ maxWidth: 600, margin: '0 auto', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <Title level={4} style={{ marginBottom: 32, textAlign: 'center' }}>Select a game to play</Title>

        {error && (
          <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} closable onClose={() => setError(null)} />
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: 32 }}>
          {games.map((game) => (
            <div
              key={game.name}
              onClick={() => {
                setSelectedGame(game.name)
                setStep('teamRegistration')
                form.resetFields()
              }}
              style={{
                padding: '20px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                gap: '16px',
                alignItems: 'flex-start',
                transition: 'all 0.2s',
                ':hover': { backgroundColor: '#f5f5f5' }
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f5f5f5'
                e.currentTarget.style.borderColor = '#d9d9d9'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.borderColor = '#e0e0e0'
              }}
            >
              <div style={{ flex: 1 }}>
                <Title level={5} style={{ marginBottom: 8, marginTop: 0 }}>{game.name}</Title>
                <Text type="secondary" style={{ fontSize: '13px' }}>Click to select this game</Text>
              </div>
            </div>
          ))}
        </div>

        <Button
          type="primary"
          size="large"
          block
          disabled={!selectedGame}
        >
          Proceed
        </Button>
      </Card>
    )
  }

  return (
    <Card style={{ maxWidth: 600, margin: '0 auto', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <Title level={4} style={{ marginBottom: 24 }}>Register team</Title>

      {error && (
        <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} closable onClose={() => setError(null)} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: 32, paddingBottom: 16, borderBottom: '1px solid #e0e0e0' }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          backgroundColor: '#e6f7ff',
          border: '2px solid #1890ff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          fontWeight: 'bold',
          color: '#1890ff'
        }}>
          2
        </div>
        <div>
          <Title level={5} style={{ margin: 0, marginBottom: 4 }}>{selectedGame}</Title>
          <Text type="secondary" style={{ fontSize: '12px' }}>Selected game</Text>
        </div>
      </div>

      <div style={{ backgroundColor: '#fafafa', padding: '12px 16px', borderRadius: '4px', marginBottom: '24px' }}>
        <Text type="secondary" style={{ fontSize: '13px' }}>
          <ul style={{ margin: '0', paddingLeft: '20px', marginLeft: '0' }}>
            <li>Minimum 3 player required to play.</li>
            <li>All Employee ID must be unique across every team.</li>
          </ul>
        </Text>
      </div>

      <Form form={form} layout="vertical" onFinish={handleRegistrationSubmit} disabled={submitting}>
        <Form.Item
          name="team_name"
          label="* Team Name"
          rules={[{ required: true, message: 'Team name is required' }]}
        >
          <Input placeholder="e.g. The Sprinters" />
        </Form.Item>

        {[1, 2, 3, 4].map((n) => {
          const isRequired = n !== 4
          const label = isRequired ? `* Player-0${n}` : `Player-0${n}`
          return (
            <Form.Item
              key={n}
              name={`eid_${n}`}
              label={label}
              rules={[
                {
                  required: isRequired,
                  message: 'Field Required',
                },
                {
                  pattern: /^.\d{6}$/,
                  message: 'Employee ID must be in this format "I7XXXXX"',
                },
              ]}
            >
              <Input placeholder={`SID: I000000`} />
            </Form.Item>
          )
        })}

        <Form.Item>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Button
              onClick={() => setStep('gameSelection')}
              size="large"
            >
              Back
            </Button>
            <Button type="primary" htmlType="submit" loading={submitting} size="large">
              Submit
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  )
}
