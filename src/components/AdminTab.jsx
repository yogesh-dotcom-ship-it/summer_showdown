import { useEffect, useState, useCallback, useMemo } from 'react'
import { Table, Button, Card, Spin, Empty, Space, Popconfirm, message, Form, Input, Modal } from 'antd'
import { DeleteOutlined, EditOutlined, DownloadOutlined, SearchOutlined } from '@ant-design/icons'
import { supabase } from '../lib/supabaseClient'
import PasswordModal from './PasswordModal'
import { generateTeamCSV, downloadCSV } from '../utils/csvExport'

export default function AdminTab() {
  const [passwordVerified, setPasswordVerified] = useState(false)
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingTeam, setEditingTeam] = useState(null)
  const [editForm] = Form.useForm()
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [search, setSearch] = useState('')

  const loadData = useCallback(async () => {
    const { data: teamsData } = await supabase
      .from('ss_teams')
      .select('team_id, team_name, game_name, status, completion_time, created_at')
      .order('created_at', { ascending: false })
    setTeams(teamsData ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!passwordVerified) return
    loadData()
  }, [passwordVerified, loadData])

  const handleDelete = async (teamId) => {
    const { data, error: teamError } = await supabase
      .from('ss_teams')
      .delete()
      .eq('team_id', teamId)
      .select()

    if (teamError) {
      message.error(`Failed to delete team: ${teamError.message}`)
      return
    }
    if (!data || data.length === 0) {
      // RLS silently blocks the delete (0 rows) when no delete policy exists.
      message.error('Delete was blocked. Check the ss_teams delete RLS policy in Supabase.')
      return
    }
    message.success('Team deleted successfully')
    loadData()
  }

  const handleEdit = (team) => {
    editForm.setFieldsValue({ team_name: team.team_name })
    setEditingTeam(team)
    setEditModalOpen(true)
  }

  const handleEditSubmit = async (values) => {
    const { error: teamError } = await supabase
      .from('ss_teams')
      .update({ team_name: values.team_name })
      .eq('team_id', editingTeam.team_id)

    if (!teamError) {
      message.success('Team updated successfully')
      setEditModalOpen(false)
      loadData()
    } else {
      message.error('Failed to update team name')
    }
  }

  const filteredTeams = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return teams
    return teams.filter((t) => (t.team_name || '').toLowerCase().includes(q))
  }, [teams, search])

  const handleExportCSV = () => {
    const csv = generateTeamCSV(teams)
    downloadCSV(csv, `teams_export_${new Date().toISOString().split('T')[0]}.csv`)
    message.success('CSV exported successfully')
  }

  const columns = [
    {
      title: 'Team Name',
      dataIndex: 'team_name',
      key: 'team_name',
      width: 180
    },
    {
      title: 'Game Name',
      dataIndex: 'game_name',
      key: 'game_name',
      width: 160
    },
    {
      title: 'Completion Time',
      dataIndex: 'completion_time',
      key: 'completion_time',
      width: 150,
      render: (text) => text || '--'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => {
        const colors = { registered: 'blue', in_progress: 'orange', completed: 'green' }
        return <span style={{ color: colors[status] || '#999' }}>{status || '--'}</span>
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
          />
          <Popconfirm
            title="Delete Team"
            description="Are you sure you want to delete this team?"
            onConfirm={() => handleDelete(record.team_id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="text" danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        </Space>
      )
    }
  ]

  if (!passwordVerified) {
    return (
      <PasswordModal
        visible={true}
        onPasswordCorrect={() => setPasswordVerified(true)}
        title="Admin Access"
      />
    )
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <Card style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ margin: 0 }}>Admin Dashboard - Team Management</h2>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={handleExportCSV}
          size="large"
        >
          Export CSV
        </Button>
      </div>

      <Input
        allowClear
        prefix={<SearchOutlined />}
        placeholder="Search by team name"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ maxWidth: 320, marginBottom: 16 }}
      />

      {teams.length === 0 ? (
        <Empty description="No teams registered yet" />
      ) : (
        <Table
          columns={columns}
          dataSource={filteredTeams.map(t => ({ ...t, key: t.team_id }))}
          scroll={{ x: 730 }}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: search ? `No teams match "${search}"` : 'No teams' }}
        />
      )}

      <Modal
        title="Edit Team"
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onOk={() => editForm.submit()}
      >
        <Form form={editForm} layout="vertical" onFinish={handleEditSubmit}>
          <Form.Item name="team_name" label="Team Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
