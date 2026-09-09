import { useEffect, useState, useCallback } from 'react'
import { Table, Button, Card, Spin, Empty, Space, Popconfirm, Alert, message, Form, Input, Modal } from 'antd'
import { DeleteOutlined, EditOutlined, DownloadOutlined } from '@ant-design/icons'
import { supabase } from '../lib/supabaseClient'
import PasswordModal from './PasswordModal'
import { generateTeamCSV, downloadCSV } from '../utils/csvExport'

export default function AdminTab() {
  const [passwordVerified, setPasswordVerified] = useState(false)
  const [teams, setTeams] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingTeam, setEditingTeam] = useState(null)
  const [editForm] = Form.useForm()
  const [editModalOpen, setEditModalOpen] = useState(false)

  const loadData = useCallback(async () => {
    const [{ data: teamsData }, { data: membersData }] = await Promise.all([
      supabase
        .from('ss_teams')
        .select('team_id, team_name, game_name, status, completion_time, created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('ss_team_members')
        .select('team_id, eid')
    ])
    setTeams(teamsData ?? [])
    setMembers(membersData ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!passwordVerified) return
    loadData()
  }, [passwordVerified, loadData])

  const handleDelete = async (teamId) => {
    const { error: membersError } = await supabase
      .from('ss_team_members')
      .delete()
      .eq('team_id', teamId)

    if (!membersError) {
      const { error: teamError } = await supabase
        .from('ss_teams')
        .delete()
        .eq('team_id', teamId)

      if (!teamError) {
        message.success('Team deleted successfully')
        loadData()
      } else {
        message.error('Failed to delete team')
      }
    } else {
      message.error('Failed to delete team members')
    }
  }

  const handleEdit = (team) => {
    const teamMembers = members.filter(m => m.team_id === team.team_id)
    editForm.setFieldsValue({
      team_name: team.team_name,
      eid_1: teamMembers[0]?.eid || '',
      eid_2: teamMembers[1]?.eid || '',
      eid_3: teamMembers[2]?.eid || '',
      eid_4: teamMembers[3]?.eid || ''
    })
    setEditingTeam(team)
    setEditModalOpen(true)
  }

  const handleEditSubmit = async (values) => {
    const { error: teamError } = await supabase
      .from('ss_teams')
      .update({ team_name: values.team_name })
      .eq('team_id', editingTeam.team_id)

    if (teamError) {
      message.error('Failed to update team name')
      return
    }

    const newEids = [values.eid_1, values.eid_2, values.eid_3, values.eid_4]
      .filter(e => e)
      .map(e => e.trim())

    await supabase.from('ss_team_members').delete().eq('team_id', editingTeam.team_id)

    const { error: membersError } = await supabase
      .from('ss_team_members')
      .insert(newEids.map(eid => ({ team_id: editingTeam.team_id, eid })))

    if (!membersError) {
      message.success('Team updated successfully')
      setEditModalOpen(false)
      loadData()
    } else {
      message.error('Failed to update team members')
    }
  }

  const handleExportCSV = () => {
    const csv = generateTeamCSV(teams, members)
    downloadCSV(csv, `teams_export_${new Date().toISOString().split('T')[0]}.csv`)
    message.success('CSV exported successfully')
  }

  const columns = [
    {
      title: 'Team Name',
      dataIndex: 'team_name',
      key: 'team_name',
      width: 150
    },
    {
      title: 'Player-01',
      key: 'eid_1',
      render: (_, record) => {
        const member = members.find(m => m.team_id === record.team_id && members.filter(x => x.team_id === record.team_id).indexOf(m) === 0)
        return member?.eid || '--'
      },
      width: 120
    },
    {
      title: 'Player-02',
      key: 'eid_2',
      render: (_, record) => {
        const teamMembers = members.filter(m => m.team_id === record.team_id)
        return teamMembers[1]?.eid || '--'
      },
      width: 120
    },
    {
      title: 'Player-03',
      key: 'eid_3',
      render: (_, record) => {
        const teamMembers = members.filter(m => m.team_id === record.team_id)
        return teamMembers[2]?.eid || '--'
      },
      width: 120
    },
    {
      title: 'Player-04',
      key: 'eid_4',
      render: (_, record) => {
        const teamMembers = members.filter(m => m.team_id === record.team_id)
        return teamMembers[3]?.eid || '--'
      },
      width: 120
    },
    {
      title: 'Completion Time',
      dataIndex: 'completion_time',
      key: 'completion_time',
      width: 130,
      render: (text) => text || '--'
    },
    {
      title: 'Game Name',
      dataIndex: 'game_name',
      key: 'game_name',
      width: 130
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
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
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Admin Dashboard - Team Management</h2>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={handleExportCSV}
          size="large"
        >
          Export CSV
        </Button>
      </div>

      {teams.length === 0 ? (
        <Empty description="No teams registered yet" />
      ) : (
        <Table
          columns={columns}
          dataSource={teams.map(t => ({ ...t, key: t.team_id }))}
          scroll={{ x: 1200 }}
          pagination={{ pageSize: 10 }}
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
          <Form.Item name="eid_1" label="Player-01 (SID)" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="eid_2" label="Player-02 (SID)" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="eid_3" label="Player-03 (SID)" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="eid_4" label="Player-04 (SID)">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
