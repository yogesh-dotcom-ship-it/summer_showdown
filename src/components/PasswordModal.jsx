import { useState } from 'react'
import { Modal, Input, Button, Alert } from 'antd'
import { LockOutlined } from '@ant-design/icons'

export default function PasswordModal({ visible, onPasswordCorrect, title = 'Enter Password' }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = () => {
    setLoading(true)
    if (password.trim() === '121000') {
      setError(null)
      setPassword('')
      setLoading(false)
      onPasswordCorrect()
    } else {
      setError('Incorrect password. Please try again.')
      setPassword('')
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setPassword('')
    setError(null)
  }

  return (
    <Modal
      title={title}
      open={visible}
      onCancel={handleCancel}
      footer={null}
      centered
      closable={false}
    >
      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}
      <Input
        placeholder="Enter password"
        type="password"
        prefix={<LockOutlined />}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onPressEnter={handleSubmit}
        autoFocus
        size="large"
        style={{ marginBottom: 16 }}
      />
      <Button type="primary" onClick={handleSubmit} block size="large" loading={loading}>
        Verify
      </Button>
    </Modal>
  )
}
