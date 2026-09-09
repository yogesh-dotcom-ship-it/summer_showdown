import { useEffect, useState, useRef } from 'react'
import { Form, Input, Select, Button, Card, Alert, Space, Typography, Row, Col, Switch } from 'antd'
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
  const [registeredTeam, setRegisteredTeam] = useState(null) // { team_id, team_name, game_name }
  const [validationEnabled, setValidationEnabled] = useState(true)
  const qrRef = useRef(null)
  const [selectedGame, setSelectedGame] = useState(null)

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

  async function handleSubmit(values) {
    setSubmitting(true)
    setError(null)

    const eids = [values.eid_1, values.eid_2, values.eid_3, values.eid_4]
      .filter((e) => e) // Filter out empty values
      .map((e) => e.trim())

    // Application-level duplicate check for a fast, friendly error message.
    // The real guard is the UNIQUE constraint on ss_team_members.eid, which
    // also covers the race where two people register at the same instant.
    if (new Set(eids).size !== eids.length) {
      setError('The same Employee ID was entered more than once for this team.')
      setSubmitting(false)
      return
    }

    const { data: existing, error: lookupError } = await supabase
      .from('ss_team_members')
      .select('eid')
      .in('eid', eids)

    if (lookupError) {
      setError('Could not validate Employee IDs. Please try again.')
      setSubmitting(false)
      return
    }

    if (existing && existing.length > 0) {
      const { data: memberTeamData } = await supabase
        .from('ss_team_members')
        .select('team_id')
        .in('eid', existing.map(e => e.eid))

      const teamIds = memberTeamData?.map(m => m.team_id) || []
      const { data: teamGameData } = await supabase
        .from('ss_teams')
        .select('game_name')
        .in('team_id', teamIds)

      const sameGameRegistrations = teamGameData?.filter(t => t.game_name === values.game_name) || []
      if (sameGameRegistrations.length > 0) {
        setError(`One or more Employee IDs are already registered for ${values.game_name}. You can register for a different game.`)
        setSubmitting(false)
        return
      }
    }

    // Insert the team, retrying on the rare team_id collision.
    let team = null
    for (let attempt = 0; attempt < MAX_TEAM_ID_ATTEMPTS && !team; attempt++) {
      const team_id = generateTeamId()
      const { data, error: insertError } = await supabase
        .from('ss_teams')
        .insert({ team_id, team_name: values.team_name.trim(), game_name: values.game_name })
        .select()
        .single()

      if (!insertError) {
        team = data
        break
      }
      if (insertError.code !== '23505') {
        // Not a collision on team_id -- a real error, stop retrying.
        setError(`Registration failed: ${insertError.message}`)
        setSubmitting(false)
        return
      }
      // 23505 = unique_violation -> team_id collision, loop and try a new code.
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
      // Roll back the team row so we don't leave an orphaned team with no members
      // (most likely cause here: an EID slipped past the pre-check via a race).
      await supabase.from('ss_teams').delete().eq('team_id', team.team_id)
      setError(
        membersError.code === '23505'
          ? 'One of these Employee IDs was just registered by someone else. Please check and try again.'
          : `Registration failed: ${membersError.message}`
      )
      setSubmitting(false)
      return
    }

    setRegisteredTeam({ team_id: team.team_id, team_name: team.team_name, game_name: team.game_name })
    setSubmitting(false)
    form.resetFields()
    setSelectedGame(null)
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
              onClick={() => setRegisteredTeam(null)}
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

  return (
    <Card style={{ maxWidth: 600, margin: '0 auto', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <Title level={4} style={{ marginBottom: 32 }}>Register team</Title>

      {error && (
        <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} closable onClose={() => setError(null)} />
      )}

      <div style={{ marginBottom: 32 }}>
        <Title level={5} style={{ marginBottom: 16 }}>Select a game to play</Title>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
          {games.map((game, idx) => (
            <div
              key={game.name}
              onClick={() => {
                setSelectedGame(game.name)
                form.setFieldValue('game_name', game.name)
              }}
              style={{
                padding: '16px',
                border: selectedGame === game.name ? `2px solid ${getGameColor(game.name, games).border}` : '1px solid #e0e0e0',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: selectedGame === game.name ? getGameColor(game.name, games).bg : '#fff',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{game.name}</div>
            </div>
          ))}
        </div>
      </div>

      <Form form={form} layout="vertical" onFinish={handleSubmit} disabled={submitting}>
        <Form.Item name="game_name" hidden>
          <Input />
        </Form.Item>

        <Form.Item
          name="team_name"
          label="* Team Name"
          rules={validationEnabled ? [{ required: true, message: 'Team name is required' }] : []}
        >
          <Input placeholder="e.g. The Sprinters" />
        </Form.Item>

        <div style={{ backgroundColor: '#fafafa', padding: '12px 16px', borderRadius: '4px', marginBottom: '16px' }}>
          <Text type="secondary" style={{ fontSize: '13px' }}>
            <ul style={{ margin: '0', paddingLeft: '20px', marginLeft: '0' }}>
              <li>Minimum 3 player required to play.</li>
              <li>All Employee ID must be unique across every team.</li>
            </ul>
          </Text>
        </div>

        {[1, 2, 3, 4].map((n) => {
          const isRequired = n !== 4
          const label = isRequired ? `* Player-0${n}` : `Player-0${n}`
          return (
            <Form.Item
              key={n}
              name={`eid_${n}`}
              label={label}
              rules={validationEnabled ? [
                {
                  required: isRequired,
                  message: 'Field Required',
                },
                {
                  pattern: /^.\d{6}$/,
                  message: 'Employee ID must be in this format "I7XXXXX"',
                },
              ] : []}
            >
              <Input placeholder={`SID: I000000`} />
            </Form.Item>
          )
        })}

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting} block size="large">
            Submit
          </Button>
        </Form.Item>
      </Form>
    </Card>
  )
}
