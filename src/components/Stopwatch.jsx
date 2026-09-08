import { useEffect, useRef, useState } from 'react'
import { Button, Space, Typography } from 'antd'
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'

const { Title } = Typography

function formatElapsed(ms) {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const centis = Math.floor((ms % 1000) / 10)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(
    centis
  ).padStart(2, '0')}`
}

// Elapsed time is tracked as accumulated ms + a running start timestamp, so
// pausing/resuming never loses time and the value submitted is genuinely
// "total time elapsed while running" -- not wall-clock start-to-finish.
export default function Stopwatch({ onSubmit, submitting, disabled }) {
  const [running, setRunning] = useState(false)
  const [accumulatedMs, setAccumulatedMs] = useState(0)
  const [displayMs, setDisplayMs] = useState(0)
  const [hasRun, setHasRun] = useState(false)
  const runStartRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    if (!running) return undefined
    function tick() {
      setDisplayMs(accumulatedMs + (Date.now() - runStartRef.current))
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [running, accumulatedMs])

  function handleStart() {
    runStartRef.current = Date.now()
    setRunning(true)
    setHasRun(true)
  }

  function handlePause() {
    setAccumulatedMs((prev) => prev + (Date.now() - runStartRef.current))
    setRunning(false)
  }

  function handleReset() {
    setRunning(false)
    setAccumulatedMs(0)
    setDisplayMs(0)
    setHasRun(false)
  }

  function handleSubmit() {
    const finalMs = running ? accumulatedMs + (Date.now() - runStartRef.current) : accumulatedMs
    const totalSeconds = Math.floor(finalMs / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    const milliseconds = finalMs % 1000
    const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(milliseconds).padStart(3, '0')}`
    onSubmit(timeString)
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <Title level={1} style={{ fontVariantNumeric: 'tabular-nums', marginBottom: 24 }}>
        {formatElapsed(displayMs)}
      </Title>
      <Space wrap>
        {!running ? (
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={handleStart}
            disabled={disabled}
          >
            {accumulatedMs > 0 ? 'Resume' : 'Start'}
          </Button>
        ) : (
          <Button icon={<PauseCircleOutlined />} onClick={handlePause}>
            Pause
          </Button>
        )}
        <Button icon={<ReloadOutlined />} onClick={handleReset} disabled={disabled || !hasRun}>
          Reset
        </Button>
        <Button
          type="primary"
          ghost
          icon={<CheckCircleOutlined />}
          onClick={handleSubmit}
          disabled={disabled || !hasRun || running}
          loading={submitting}
        >
          Submit Time
        </Button>
      </Space>
      {running && (
        <div style={{ marginTop: 8, color: '#999' }}>Pause the timer before submitting.</div>
      )}
    </div>
  )
}