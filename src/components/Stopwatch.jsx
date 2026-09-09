import { useEffect, useRef, useState } from 'react'
import { Button } from 'antd'
import { RightOutlined } from '@ant-design/icons'

function formatElapsed(ms) {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  const milliseconds = ms % 1000
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(
    milliseconds
  ).padStart(3, '0')}`
}

// Elapsed time is tracked as accumulated ms + a running start timestamp, so
// pausing/resuming never loses time and the value submitted is genuinely
// "total time elapsed while running" -- not wall-clock start-to-finish.
export default function Stopwatch({ onSubmit, submitting, disabled }) {
  const [running, setRunning] = useState(false)
  const [accumulatedMs, setAccumulatedMs] = useState(0)
  const [displayMs, setDisplayMs] = useState(0)
  const [hasRun, setHasRun] = useState(false)
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const runStartRef = useRef(null)
  const rafRef = useRef(null)
  const trackRef = useRef(null)

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

  function doSubmit() {
    const finalMs = running ? accumulatedMs + (Date.now() - runStartRef.current) : accumulatedMs
    onSubmit(formatElapsed(finalMs))
  }

  const canSubmit = !disabled && hasRun && !running

  function handlePointerDown() {
    if (!canSubmit) return
    setDragging(true)
  }

  function handlePointerMove(e) {
    if (!dragging || !trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const max = rect.width - 44
    const x = Math.min(Math.max(clientX - rect.left - 22, 0), max)
    setDragX(x)
    if (x >= max - 4) {
      setDragging(false)
      setDragX(0)
      doSubmit()
    }
  }

  function handlePointerUp() {
    if (!dragging) return
    setDragging(false)
    setDragX(0)
  }

  useEffect(() => {
    if (!dragging) return undefined
    window.addEventListener('mousemove', handlePointerMove)
    window.addEventListener('mouseup', handlePointerUp)
    window.addEventListener('touchmove', handlePointerMove)
    window.addEventListener('touchend', handlePointerUp)
    return () => {
      window.removeEventListener('mousemove', handlePointerMove)
      window.removeEventListener('mouseup', handlePointerUp)
      window.removeEventListener('touchmove', handlePointerMove)
      window.removeEventListener('touchend', handlePointerUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging])

  return (
    <div>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '10px',
        padding: '32px 16px',
        textAlign: 'center',
        marginBottom: '16px'
      }}>
        <div style={{
          fontSize: '40px',
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          marginBottom: 24,
          color: '#000'
        }}>
          {formatElapsed(displayMs)}
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <Button size="large" onClick={handleReset} disabled={disabled || !hasRun || running} style={{ minWidth: 100 }}>
            Reset
          </Button>
          {!running ? (
            <Button type="primary" size="large" onClick={handleStart} disabled={disabled} style={{ minWidth: 100 }}>
              {accumulatedMs > 0 ? 'Resume' : 'Start'}
            </Button>
          ) : (
            <Button type="primary" size="large" onClick={handlePause} style={{ minWidth: 100 }}>
              Pause
            </Button>
          )}
        </div>
      </div>

      <div
        ref={trackRef}
        style={{
          position: 'relative',
          height: 48,
          borderRadius: 24,
          border: '1px solid #1677ff',
          backgroundColor: '#fff',
          overflow: 'hidden',
          opacity: canSubmit ? 1 : 0.5,
          userSelect: 'none'
        }}
      >
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#1677ff',
          fontWeight: 500,
          fontSize: '14px',
          pointerEvents: 'none'
        }}>
          {submitting ? 'Submitting…' : 'Swipe to submit'}
        </div>
        <div
          onMouseDown={handlePointerDown}
          onTouchStart={handlePointerDown}
          style={{
            position: 'absolute',
            top: 2,
            left: 2,
            width: 40,
            height: 40,
            borderRadius: '50%',
            backgroundColor: '#1677ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            cursor: canSubmit ? 'grab' : 'not-allowed',
            transform: `translateX(${dragX}px)`,
            transition: dragging ? 'none' : 'transform 0.2s'
          }}
        >
          <RightOutlined />
        </div>
      </div>
    </div>
  )
}
