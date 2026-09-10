import { useEffect, useState, useRef } from 'react'
import { Form, Input, Button, Card, Alert, Space, Typography } from 'antd'
import { QRCodeCanvas } from 'qrcode.react'
import html2canvas from 'html2canvas'
import { supabase } from '../lib/supabaseClient'
import { generateTeamId } from '../utils/teamId'
import { getGameImage } from '../utils/gameImages'
import { getGameDescription } from '../utils/gameDescriptions'
import { suggestTeamNames } from '../utils/teamNameSuggestions'
import { encodeTeamQR } from '../utils/qrPayload'

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
  const [nameError, setNameError] = useState(null)
  const [nameSuggestions, setNameSuggestions] = useState([])
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
    setNameError(null)
    setNameSuggestions([])

    const teamName = values.team_name.trim()

    // Team names must be unique across every team, regardless of game.
    // Fetch every existing name once: used both to detect the clash
    // (case-insensitively) and to filter the suggestions. The real guard is
    // the unique index on lower(team_name) in the database.
    const { data: allTeams, error: nameLookupError } = await supabase
      .from('ss_teams')
      .select('team_name')

    if (nameLookupError) {
      setError('Could not validate the team name. Please try again.')
      setSubmitting(false)
      return
    }

    const takenLower = new Set((allTeams ?? []).map((t) => t.team_name.trim().toLowerCase()))

    if (takenLower.has(teamName.toLowerCase())) {
      setNameSuggestions(suggestTeamNames(teamName, takenLower))
      setNameError(`Team name "${teamName}" is already taken. Please choose a different name.`)
      setSubmitting(false)
      return
    }

    const eids = [values.eid_1, values.eid_2, values.eid_3, values.eid_4]
      .filter((e) => e)
      .map((e) => e.trim())

    if (new Set(eids).size !== eids.length) {
      setError('The same Employee ID was entered more than once for this team.')
      setSubmitting(false)
      return
    }

    // Employee IDs are collected and printed onto the QR code, but are NOT
    // stored in the database (company legal policy). ss_teams holds only the
    // team_id / name / game -- enough for the leaderboard and timing.
    let team = null
    for (let attempt = 0; attempt < MAX_TEAM_ID_ATTEMPTS && !team; attempt++) {
      const team_id = generateTeamId()
      const { data, error: insertError } = await supabase
        .from('ss_teams')
        .insert({ team_id, team_name: teamName, game_name: selectedGame })
        .select()
        .single()

      if (!insertError) {
        team = data
        break
      }
      // 23505 = unique_violation. Could be team_id (retry with a new code)
      // or team_name (someone just took it -- retrying the same name won't
      // help).
      if (insertError.code === '23505' && insertError.message?.includes('team_name')) {
        const { data: latestTeams } = await supabase.from('ss_teams').select('team_name')
        const latestTakenLower = new Set((latestTeams ?? []).map((t) => t.team_name.trim().toLowerCase()))
        setNameSuggestions(suggestTeamNames(teamName, latestTakenLower))
        setNameError(`Team name "${teamName}" was just taken by someone else. Please choose a different name.`)
        setSubmitting(false)
        return
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

    setRegisteredTeam({
      team_id: team.team_id,
      team_name: team.team_name,
      game_name: selectedGame,
      eids,
    })
    setSubmitting(false)
    setNameError(null)
    setNameSuggestions([])
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
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'inline-block' }}>
                <QRCodeCanvas
                  value={encodeTeamQR({
                    teamId: registeredTeam.team_id,
                    teamName: registeredTeam.team_name,
                    gameName: registeredTeam.game_name,
                    eids: registeredTeam.eids,
                  })}
                  size={240}
                  includeMargin
                  level="M"
                />
              </div>
            </div>
            {registeredTeam.eids?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginBottom: 8 }}>
                {registeredTeam.eids.map((eid, idx) => (
                  <span key={idx} style={{
                    padding: '4px 12px',
                    border: '1px solid rgba(0,0,0,0.15)',
                    borderRadius: '16px',
                    fontSize: '12px',
                    backgroundColor: 'rgba(255,255,255,0.6)'
                  }}>
                    {eid}
                  </span>
                ))}
              </div>
            )}
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
                  flexShrink: 0,
                  overflow: 'hidden'
                }}>
                  {getGameImage(game.name) ? (
                    <img
                      src={getGameImage(game.name)}
                      alt={game.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : '🎮'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: 4 }}>{game.name}</div>
                  <div style={{ fontSize: '13px', color: '#8c8c8c', lineHeight: '1.4' }}>
                    {getGameDescription(game.name)}
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
            setError(null)
            setNameError(null)
            setNameSuggestions([])
            form.resetFields()
          }}
        >
          Proceed
        </Button>
      </Card>
    )
  }

  return (
    <Card style={{ maxWidth: 600, margin: '0 auto', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <Title level={4} style={{ marginBottom: 20 }}>Register team</Title>

      {error && (
        <Alert
          type="error"
          showIcon
          message={error}
          style={{ marginBottom: 16 }}
          closable
          onClose={() => setError(null)}
        />
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
          flexShrink: 0,
          overflow: 'hidden'
        }}>
          {getGameImage(selectedGame) ? (
            <img
              src={getGameImage(selectedGame)}
              alt={selectedGame}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : '🎮'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: 4 }}>{selectedGame}</div>
          <div style={{ fontSize: '13px', color: '#8c8c8c', lineHeight: '1.4' }}>
            {getGameDescription(selectedGame)}
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: '#f5f5f5', padding: '12px 16px', borderRadius: '4px', marginBottom: '16px' }}>
        <Text style={{ fontSize: '13px', color: '#595959' }}>
          <ul style={{ margin: '0', paddingLeft: '16px' }}>
            <li>Minimum 3 player required to play.</li>
            <li>Employee IDs are printed on your QR code and are not stored.</li>
          </ul>
        </Text>
      </div>

      <Form form={form} layout="vertical" onFinish={handleRegistrationSubmit} disabled={submitting}>
        <Form.Item
          name="team_name"
          label="Team Name"
          required
          rules={[{ required: true, message: 'Team name is required' }]}
          validateStatus={nameError ? 'error' : undefined}
          help={nameError || undefined}
          style={{ marginBottom: nameSuggestions.length > 0 ? 4 : undefined }}
        >
          <Input
            placeholder="e.g. The Sprinters"
            onChange={() => {
              if (nameError || nameSuggestions.length > 0) {
                setNameError(null)
                setNameSuggestions([])
              }
            }}
          />
        </Form.Item>

        {nameSuggestions.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: '13px', color: '#8c8c8c' }}>Try one of these:</Text>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: 6 }}>
              {nameSuggestions.map((s) => (
                <Button
                  key={s}
                  size="small"
                  onClick={() => {
                    form.setFieldValue('team_name', s)
                    setNameError(null)
                    setNameSuggestions([])
                  }}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
        )}

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
