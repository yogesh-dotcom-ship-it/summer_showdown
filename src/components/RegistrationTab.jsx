import { useEffect, useState, useRef } from 'react'
import { Form, Input, Button, Card, Alert, Space, Typography } from 'antd'
import { QRCodeCanvas } from 'qrcode.react'
import html2canvas from 'html2canvas'
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

// Table numbers follow the same fixed game order as colors -- game 1 is
// table 1, game 2 is table 2, etc. -- so the assignment stays consistent
// with the color shown on the same card.
function getTableNumber(gameName, games) {
  const gameIndex = games.findIndex(g => g.name === gameName)
  return gameIndex >= 0 ? gameIndex + 1 : 1
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
  const [downloading, setDownloading] = useState(false)
  const successCardRef = useRef(null)

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

    // Fast, friendly pre-check: is any of these EIDs already registered for
    // THIS specific game? (Same EID on a different game is fine.) The real
    // guard is the unique(eid, game_name) constraint on ss_team_members --
    // this only covers the common case with a nicer error message before
    // hitting the database.
    const { data: sameGameMembers, error: lookupError } = await supabase
      .from('ss_team_members')
      .select('eid')
      .eq('game_name', selectedGame)
      .in('eid', eids)

    if (lookupError) {
      setError('Could not validate Employee IDs. Please try again.')
      setSubmitting(false)
      return
    }

    if (sameGameMembers && sameGameMembers.length > 0) {
      const duplicateEids = sameGameMembers.map((m) => m.eid).join(', ')
      setError(`Employee ID(s) ${duplicateEids} already registered for ${selectedGame}.`)
      setSubmitting(false)
      return
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
          ? `One of these Employee IDs was just registered for ${selectedGame} by someone else. Please check and try again.`
          : `Registration failed: ${membersError.message}`
      )
      setSubmitting(false)
      return
    }

    setRegisteredTeam({ team_id: team.team_id, team_name: team.team_name, game_name: selectedGame })
    setSubmitting(false)
    form.resetFields()
  }

  const handleDownloadQR = async () => {
    if (!successCardRef.current) return
    setDownloading(true)
    try {
      const canvas = await html2canvas(successCardRef.current, {
        backgroundColor: null,
        scale: 2,
      })
      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/png')
      link.download = `${registeredTeam.team_name}_registration.png`
      link.click()
    } finally {
      setDownloading(false)
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
        backgroundColor: gameColor.bg
      }}>
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div ref={successCardRef} style={{ backgroundColor: gameColor.bg, padding: '8px' }}>
            <div style={{ fontSize: '22px', marginBottom: 8 }}>✅</div>
            <Title level={3} style={{ marginBottom: 20, marginTop: 0 }}>
              Registration successful
            </Title>
            <div style={{ marginBottom: 24, fontSize: '14px' }}>
              <span>Show this QR code to&nbsp;: </span>
              <span style={{ fontSize: '18px', fontWeight: 600 }}>
                Table no. {String(getTableNumber(registeredTeam.game_name, games)).padStart(2, '0')}
              </span>
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'inline-block' }}>
                <QRCodeCanvas value={registeredTeam.team_id} size={240} includeMargin level="H" />
              </div>
            </div>
          </div>
          <Space style={{ width: '100%', justifyContent: 'center', gap: '12px', marginTop: 24 }}>
            <Button
              onClick={() => {
                setRegisteredTeam(null)
                setStep('gameSelection')
                setSelectedGame(null)
              }}
              size="large"
              style={{ minWidth: '110px' }}
            >
              Close
            </Button>
            <Button
              type="primary"
              onClick={handleDownloadQR}
              loading={downloading}
              size="large"
              style={{ minWidth: '110px' }}
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
        <Title level={4} style={{ marginBottom: 20 }}>Select a game to play</Title>

        {error && (
          <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} closable onClose={() => setError(null)} />
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: 24 }}>
          {games.map((game, idx) => {
            const isSelected = selectedGame === game.name
            return (
              <div
                key={game.name}
                onClick={() => setSelectedGame(game.name)}
                style={{
                  padding: '12px',
                  border: isSelected ? '1px solid #1677ff' : '1px solid #e8e8e8',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'center',
                }}
              >
                <div style={{
                  width: 72,
                  height: 72,
                  borderRadius: '8px',
                  backgroundColor: getGameColor(game.name, games).bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  flexShrink: 0
                }}>
                  🎮
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: 4 }}>{game.name}</div>
                  <div style={{ fontSize: '13px', color: '#8c8c8c', lineHeight: '1.4' }}>
                    {game.description || 'Teams race to complete this challenge.'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <Button
          type="primary"
          size="large"
          block
          disabled={!selectedGame}
          onClick={() => {
            setStep('teamRegistration')
            form.resetFields()
          }}
        >
          Proceed
        </Button>
      </Card>
    )
  }

  const currentGame = games.find(g => g.name === selectedGame)

  return (
    <Card style={{ maxWidth: 600, margin: '0 auto', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <Title level={4} style={{ marginBottom: 20 }}>Register team</Title>

      {error && (
        <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} closable onClose={() => setError(null)} />
      )}

      <div style={{
        padding: '12px',
        border: '1px solid #e8e8e8',
        borderRadius: '8px',
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <div style={{
          width: 72,
          height: 72,
          borderRadius: '8px',
          backgroundColor: getGameColor(selectedGame, games).bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '32px',
          flexShrink: 0
        }}>
          🎮
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: 4 }}>{selectedGame}</div>
          <div style={{ fontSize: '13px', color: '#8c8c8c', lineHeight: '1.4' }}>
            {currentGame?.description || 'Teams race to complete this challenge.'}
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: '#f5f5f5', padding: '12px 16px', borderRadius: '4px', marginBottom: '16px' }}>
        <Text style={{ fontSize: '13px', color: '#595959' }}>
          <ul style={{ margin: '0', paddingLeft: '16px' }}>
            <li>Minimum 3 player required to play.</li>
            <li>All employee ID must be unique across every team.</li>
          </ul>
        </Text>
      </div>

      <Form form={form} layout="vertical" onFinish={handleRegistrationSubmit} disabled={submitting}>
        <Form.Item
          name="team_name"
          label="Team Name"
          required
          rules={[{ required: true, message: 'Team name is required' }]}
        >
          <Input placeholder="e.g. The Sprinters" />
        </Form.Item>

        {[1, 2, 3, 4].map((n) => {
          const isRequired = n !== 4
          return (
            <Form.Item
              key={n}
              name={`eid_${n}`}
              label={`Player-0${n}`}
              required={isRequired}
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
              <Input placeholder="SID: I000000" />
            </Form.Item>
          )
        })}

        <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
          <Button type="primary" htmlType="submit" loading={submitting} block size="large">
            Submit
          </Button>
        </Form.Item>
      </Form>
    </Card>
  )
}
