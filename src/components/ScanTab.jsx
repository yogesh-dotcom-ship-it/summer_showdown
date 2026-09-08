import { useEffect, useRef, useState } from 'react'
import { Card, Alert, Typography, Descriptions, Button, Tag, Popconfirm, Space } from 'antd'
import { Html5Qrcode } from 'html5-qrcode'
import { supabase } from '../lib/supabaseClient'
import Stopwatch from './Stopwatch'

const { Title, Text } = Typography
const SCANNER_ELEMENT_ID = 'qr-scanner-region'

export default function ScanTab() {
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState(null)
  const [team, setTeam] = useState(null) // { team_id, team_name, game_name, status, completion_time }
  const [members, setMembers] = useState([])
  const [lookupError, setLookupError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const scannerRef = useRef(null)

  useEffect(() => {
    if (!scanning) return undefined

    const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID)
    scannerRef.current = scanner
    let stopped = false

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          if (stopped) return
          stopped = true
          setScanning(false)
          lookupTeam(decodedText.trim())
        },
        () => {
          // per-frame decode failures are normal while the camera hunts for a code; ignore
        }
      )
      .catch(() => {
        setScanError(
          'Could not access the camera. Check camera permissions for this site and that it is served over HTTPS.'
        )
        setScanning(false)
      })

    return () => {
      stopped = true
      // stop() and clear() must run in sequence, not in parallel -- clear()
      // throws "Cannot clear while scan is ongoing" if it runs before stop()
      // has actually finished tearing down the camera.
      scanner
        .stop()
        .catch(() => {})
        .then(() => scanner.clear())
        .catch(() => {})
    }
  }, [scanning])

  async function lookupTeam(teamId) {
    setLookupError(null)
    setSubmitError(null)
    const { data: teamData, error: teamError } = await supabase
      .from('ss_teams')
      .select('team_id, team_name, game_name, status, completion_time')
      .eq('team_id', teamId)
      .maybeSingle()

    if (teamError || !teamData) {
      setLookupError('QR code is not valid.')
      setTeam(null)
      return
    }

    const { data: memberData } = await supabase
      .from('ss_team_members')
      .select('eid')
      .eq('team_id', teamId)

    setTeam(teamData)
    setMembers(memberData?.map((m) => m.eid) ?? [])

    // Mark the team as in progress the moment it's scanned in, so the
    // dashboard's "Next Turn" ordering reflects who's currently running.
    if (teamData.status === 'registered') {
      await supabase
        .from('ss_teams')
        .update({ status: 'in_progress', started_at: new Date().toISOString() })
        .eq('team_id', teamId)
    }
  }

  async function handleSubmitTime(elapsedTime) {
    if (!team) return
    setSubmitting(true)
    setSubmitError(null)
    const { data, error } = await supabase
      .from('ss_teams')
      .update({
        completion_time: elapsedTime,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('team_id', team.team_id)
      .select()
      .single()

    if (error) {
      setSubmitError(`Could not save the time: ${error.message}`)
    } else {
      setTeam(data)
    }
    setSubmitting(false)
  }

  function reset() {
    setTeam(null)
    setMembers([])
    setLookupError(null)
    setSubmitError(null)
    setScanError(null)
  }

  return (
    <Card style={{ maxWidth: 600, margin: '0 auto', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <Title level={4}>Scan Team QR Code</Title>

      {!team && (
        <>
          {scanError && <Alert type="error" showIcon message={scanError} style={{ marginBottom: 16 }} />}
          {lookupError && (
            <Alert type="warning" showIcon message={lookupError} style={{ marginBottom: 16 }} />
          )}
          {!scanning ? (
            <Button type="primary" size="large" onClick={() => { reset(); setScanning(true) }}>
              Start Scanning
            </Button>
          ) : (
            <>
              <div id={SCANNER_ELEMENT_ID} style={{ width: '100%' }} />
              <Button
                block
                style={{ marginTop: 12 }}
                onClick={() => setScanning(false)}
              >
                Cancel
              </Button>
            </>
          )}
        </>
      )}

      {team && (
        <>
          <div style={{ marginBottom: 24 }}>
            <Title level={5} style={{ marginBottom: 8, fontSize: '14px', fontWeight: '600' }}>
              Team name : {team.team_name}
            </Title>
            <div style={{ lineHeight: '1.8' }}>
              {members.map((eid, idx) => (
                <div key={idx}>
                  Player {String(idx + 1).padStart(2, '0')}
                  <br />
                  {eid}
                </div>
              ))}
            </div>
          </div>

          {submitError && (
            <Alert type="error" showIcon message={submitError} style={{ marginBottom: 16 }} />
          )}

          {team.status === 'completed' ? (
            <>
              <Alert
                type="success"
                showIcon
                message={`Time already recorded: ${team.completion_time}`}
                style={{ marginBottom: 16 }}
              />
              <Space style={{ width: '100%', justifyContent: 'center' }}>
                <Popconfirm
                  title="Re-time this team?"
                  description="This overwrites their previously submitted time."
                  onConfirm={() => setTeam({ ...team, status: 'in_progress' })}
                >
                  <Button danger>Re-time</Button>
                </Popconfirm>
                <Button onClick={reset}>Scan Next Team</Button>
              </Space>
            </>
          ) : (
            <Stopwatch onSubmit={handleSubmitTime} submitting={submitting} />
          )}

          {team.status !== 'completed' && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Text type="secondary">
                <a onClick={reset}>Scan a different team</a>
              </Text>
            </div>
          )}
        </>
      )}
    </Card>
  )
}
