import { useEffect, useRef, useState } from 'react'
import { Card, Alert, Typography, Button, Popconfirm, Space } from 'antd'
import { Html5Qrcode } from 'html5-qrcode'
import { supabase } from '../lib/supabaseClient'
import Stopwatch from './Stopwatch'
import PasswordModal from './PasswordModal'
import { decodeTeamQR } from '../utils/qrPayload'
import { getGameColor } from '../utils/gameColors'

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
  const [passwordVerified, setPasswordVerified] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [games, setGames] = useState([])
  const scannerRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('ss_games')
      .select('name')
      .order('name', { ascending: true })
      .then(({ data }) => {
        if (!cancelled) setGames(data ?? [])
      })
    return () => {
      cancelled = true
    }
  }, [])

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
          handleScan(decodedText)
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

  async function handleScan(decodedText) {
    setLookupError(null)
    setSubmitError(null)

    const payload = decodeTeamQR(decodedText)
    if (!payload) {
      setLookupError('QR code is not valid.')
      setTeam(null)
      return
    }

    // The QR carries the team name, game, and employee IDs -- those are NOT
    // in the database (legal policy). The database row exists only for the
    // leaderboard / timing, and is looked up by team_id for its status.
    const { data: teamData, error: teamError } = await supabase
      .from('ss_teams')
      .select('team_id, team_name, game_name, status, completion_time')
      .eq('team_id', payload.teamId)
      .maybeSingle()

    if (teamError || !teamData) {
      setLookupError('QR code is not valid.')
      setTeam(null)
      return
    }

    // Trust the QR for display fields; fall back to the DB row for a legacy
    // (id-only) QR that carries no name/game.
    setTeam({
      ...teamData,
      team_name: payload.teamName || teamData.team_name,
      game_name: payload.gameName || teamData.game_name,
    })
    setMembers(payload.eids ?? [])

    // Mark the team as in progress the moment it's scanned in, so the
    // dashboard's "Next Turn" ordering reflects who's currently running.
    if (teamData.status === 'registered') {
      await supabase
        .from('ss_teams')
        .update({ status: 'in_progress', started_at: new Date().toISOString() })
        .eq('team_id', payload.teamId)
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
    setPasswordVerified(false)
    setShowPassword(false)
  }

  const gameColor = team ? getGameColor(team.game_name, games) : null

  return (
    <>
      <PasswordModal
        visible={showPassword}
        onPasswordCorrect={() => {
          setPasswordVerified(true)
          setShowPassword(false)
        }}
        title="Verify Access"
      />

      <Card style={{
        maxWidth: 600,
        margin: '0 auto',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        ...(team && gameColor ? { backgroundColor: gameColor.bg } : {})
      }}>
        {!team && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            {scanError && <Alert type="error" showIcon message={scanError} style={{ marginBottom: 16, textAlign: 'left' }} />}
            {lookupError && (
              <Alert type="warning" showIcon message={lookupError} style={{ marginBottom: 16, textAlign: 'left' }} />
            )}
            {!scanning ? (
              <>
                <div style={{ fontSize: '160px', lineHeight: 1, marginBottom: 32, color: '#8dbde8' }}>
                  <svg width="180" height="180" viewBox="0 0 180 180" fill="none" style={{ margin: '0 auto' }}>
                    <rect x="10" y="10" width="50" height="50" fill="#8dbde8"/>
                    <rect x="120" y="10" width="50" height="50" fill="#8dbde8"/>
                    <rect x="10" y="120" width="50" height="50" fill="#8dbde8"/>
                    <rect x="25" y="25" width="20" height="20" fill="#fff"/>
                    <rect x="135" y="25" width="20" height="20" fill="#fff"/>
                    <rect x="25" y="135" width="20" height="20" fill="#fff"/>
                    <rect x="75" y="10" width="15" height="15" fill="#8dbde8"/>
                    <rect x="100" y="30" width="15" height="15" fill="#8dbde8"/>
                    <rect x="75" y="50" width="15" height="15" fill="#8dbde8"/>
                    <rect x="120" y="75" width="15" height="15" fill="#8dbde8"/>
                    <rect x="150" y="95" width="15" height="15" fill="#8dbde8"/>
                    <rect x="75" y="100" width="15" height="15" fill="#8dbde8"/>
                    <rect x="95" y="120" width="15" height="15" fill="#8dbde8"/>
                    <rect x="75" y="150" width="15" height="15" fill="#8dbde8"/>
                    <rect x="120" y="140" width="30" height="30" fill="#8dbde8"/>
                  </svg>
                </div>
                <Button type="primary" size="large" onClick={() => { reset(); setScanning(true) }} style={{ minWidth: 220 }}>
                  Scan QR to start
                </Button>
              </>
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
          </div>
        )}

        {team && !passwordVerified && (
          <div style={{ textAlign: 'center' }}>
            <Button type="primary" size="large" onClick={() => setShowPassword(true)} block>
              Verify Password to Continue
            </Button>
            <Button onClick={reset} style={{ marginTop: 12 }} block>
              Scan Another Team
            </Button>
          </div>
        )}

        {team && passwordVerified && (
          <>
            <div style={{ marginBottom: 16 }}>
              <Title level={4} style={{ marginBottom: 4, marginTop: 0 }}>
                {team.game_name}
              </Title>
              <Text style={{ fontSize: '13px', color: '#595959' }}>
                Team name : {team.team_name}
              </Text>
              <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {members.map((eid, idx) => (
                  <span key={idx} style={{
                    padding: '4px 12px',
                    border: '1px solid #d9d9d9',
                    borderRadius: '16px',
                    fontSize: '12px',
                    backgroundColor: '#fff'
                  }}>
                    {eid}
                  </span>
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
    </>
  )
}
