import { useEffect, useState } from 'react'
import { Form, Input, Select, Button, Card, Alert, Space, Typography, Row, Col } from 'antd'
import { QRCodeCanvas } from 'qrcode.react'
import { supabase } from '../lib/supabaseClient'
import { generateTeamId } from '../utils/teamId'

const { Title, Text } = Typography

const MAX_TEAM_ID_ATTEMPTS = 5

export default function RegistrationTab() {
  const [form] = Form.useForm()
  const [games, setGames] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [registeredTeam, setRegisteredTeam] = useState(null) // { team_id, team_name }

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

    const eids = [values.eid_1, values.eid_2, values.eid_3, values.eid_4].map((e) =>
      e.trim()
    )

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
      setError(
        `Employee ID(s) already registered on another team: ${existing
          .map((r) => r.eid)
          .join(', ')}`
      )
      setSubmitting(false)
      return
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

    setRegisteredTeam({ team_id: team.team_id, team_name: team.team_name })
    setSubmitting(false)
    form.resetFields()
  }

  if (registeredTeam) {
    return (
      <Card style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
        <Alert
          type="success"
          showIcon
          message="Team registered!"
          description={`"${registeredTeam.team_name}" is set. Show this QR code at the scan station.`}
          style={{ marginBottom: 24 }}
        />
        <QRCodeCanvas value={registeredTeam.team_id} size={220} includeMargin />
        <Title level={4} style={{ marginTop: 16 }}>
          {registeredTeam.team_id}
        </Title>
        <Button type="primary" onClick={() => setRegisteredTeam(null)}>
          Register another team
        </Button>
      </Card>
    )
  }

  return (
    <Card style={{ maxWidth: 480, margin: '0 auto' }}>
      <Title level={4}>Register a Team</Title>
      {error && (
        <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} closable onClose={() => setError(null)} />
      )}
      <Form form={form} layout="vertical" onFinish={handleSubmit} disabled={submitting}>
        <Form.Item
          name="team_name"
          label="Team Name"
          rules={[{ required: true, message: 'Team name is required' }]}
        >
          <Input placeholder="e.g. The Sprinters" />
        </Form.Item>

        <Form.Item
          name="game_name"
          label="Game"
          rules={[{ required: true, message: 'Select a game' }]}
        >
          <Select
            placeholder="Select a game"
            options={games.map((g) => ({ value: g.name, label: g.name }))}
            loading={games.length === 0}
          />
        </Form.Item>

        <Row gutter={12}>
          {[1, 2, 3, 4].map((n) => (
            <Col span={12} key={n}>
              <Form.Item
                name={`eid_${n}`}
                label={`Employee ID ${n}`}
                rules={[{ required: true, message: 'Required' }]}
              >
                <Input placeholder={`EID ${n}`} />
              </Form.Item>
            </Col>
          ))}
        </Row>

        <Form.Item>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button type="primary" htmlType="submit" loading={submitting} block>
              Register Team
            </Button>
          </Space>
        </Form.Item>
      </Form>
      <Text type="secondary">All four Employee IDs must be unique across every team.</Text>
    </Card>
  )
}
