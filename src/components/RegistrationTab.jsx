import { useEffect, useState, useRef } from 'react'
import { Form, Input, Select, Button, Card, Alert, Space, Typography, Row, Col, Switch } from 'antd'
import { QRCodeCanvas } from 'qrcode.react'
import { DownloadOutlined } from '@ant-design/icons'
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
  const [validationEnabled, setValidationEnabled] = useState(true)
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
    return (
      <Card style={{ maxWidth: 600, margin: '0 auto', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center' }}>
          <Alert
            type="success"
            showIcon
            message="Registration successful"
            style={{ marginBottom: 24, textAlign: 'left' }}
          />
          <Title level={5} style={{ marginBottom: 24, fontSize: '16px', textAlign: 'left' }}>
            Team Name :
          </Title>
          <Title level={4} style={{ marginBottom: 24, fontSize: '24px', textAlign: 'center' }}>
            {registeredTeam.team_name}
          </Title>
          <div style={{ marginBottom: 24, padding: '12px 16px', backgroundColor: '#f6ffed', borderRadius: '4px', border: '1px solid #b7eb8f' }}>
            <Text style={{ fontSize: '14px', color: '#595959' }}>
              Show this QR code at the scan station.
            </Text>
          </div>
          <div style={{ marginBottom: 24, padding: '16px', backgroundColor: '#fafafa', borderRadius: '4px', display: 'inline-block' }}>
            <div ref={qrRef}>
              <QRCodeCanvas value={registeredTeam.team_id} size={220} includeMargin />
            </div>
          </div>
          <Title level={5} style={{ marginTop: 24, marginBottom: 24, fontSize: '14px' }}>
            QR Code
          </Title>
          <Space style={{ width: '100%', justifyContent: 'flex-start', gap: '8px', flexDirection: 'column' }}>
            <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownloadQR} size="large" block>
              Download QR
            </Button>
            <Button onClick={() => setRegisteredTeam(null)} size="large" block>
              Go back
            </Button>
          </Space>
        </div>
      </Card>
    )
  }

  return (
    <Card style={{ maxWidth: 600, margin: '0 auto', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <Title level={4} style={{ margin: 0 }}>Register a Team</Title>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Text style={{ fontSize: '12px' }}>Validation</Text>
          <Switch checked={validationEnabled} onChange={setValidationEnabled} />
        </div>
      </div>
      {error && (
        <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} closable onClose={() => setError(null)} />
      )}
      <Form form={form} layout="vertical" onFinish={handleSubmit} disabled={submitting}>
        <Form.Item
          name="team_name"
          label="Team Name"
          rules={validationEnabled ? [{ required: true, message: 'Team name is required' }] : []}
        >
          <Input placeholder="e.g. The Sprinters" />
        </Form.Item>

        <Form.Item
          name="game_name"
          label="Select game"
          rules={validationEnabled ? [{ required: true, message: 'Select a game' }] : []}
        >
          <Select
            placeholder="Select a game"
            options={games.map((g) => ({ value: g.name, label: g.name }))}
            loading={games.length === 0}
          />
        </Form.Item>

        {validationEnabled && (
          <div style={{ backgroundColor: '#fafafa', padding: '12px 16px', borderRadius: '4px', marginBottom: '16px' }}>
            <Text type="secondary" style={{ fontSize: '13px' }}>
              <ul style={{ margin: '0', paddingLeft: '0', marginLeft: '0' }}>
                <li>Minimum 3 players required to play.</li>
                <li>All Employee IDs must be unique across every team.</li>
              </ul>
            </Text>
          </div>
        )}

        {[1, 2, 3, 4].map((n) => {
          const isRequired = n !== 4
          return (
            <Form.Item
              key={n}
              name={`eid_${n}`}
              label={`Player-0${n}`}
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
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button type="primary" htmlType="submit" loading={submitting} block size="large">
              Register Team
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  )
}
