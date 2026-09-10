import { useState } from 'react'
import { ConfigProvider, Layout, Typography, Button, Drawer, Menu } from 'antd'
import { MenuOutlined } from '@ant-design/icons'
import RegistrationTab from './components/RegistrationTab'
import ScanTab from './components/ScanTab'
import DashboardTab from './components/DashboardTab'
import AdminTab from './components/AdminTab'

const { Header, Content } = Layout
const { Title } = Typography

function App() {
  const [currentPage, setCurrentPage] = useState('register')
  const [drawerOpen, setDrawerOpen] = useState(false)
  // Bumped every time a menu item is clicked, so re-selecting a page
  // re-mounts it and clears its internal state (e.g. the registration
  // success screen, which otherwise has no way back to the form).
  const [navNonce, setNavNonce] = useState(0)

  const menuItems = [
    { key: 'register', label: 'Registration' },
    { key: 'scan', label: 'Start game' },
    { key: 'dashboard', label: 'Leaderboard' },
    { key: 'admin', label: 'Dashboard' },
  ]

  const handleMenuClick = (key) => {
    setCurrentPage(key)
    setNavNonce((n) => n + 1)
    setDrawerOpen(false)
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'register':
        return <RegistrationTab key={navNonce} />
      case 'scan':
        return <ScanTab key={navNonce} />
      case 'dashboard':
        return <DashboardTab />
      case 'admin':
        return <AdminTab />
      default:
        return <RegistrationTab key={navNonce} />
    }
  }

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#1677ff' } }}>
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '24px' }}>
          <Button
            type="text"
            icon={<MenuOutlined />}
            size="large"
            style={{ color: '#fff' }}
            onClick={() => setDrawerOpen(true)}
          />
          <Title level={3} style={{ color: '#fff', margin: 0, flex: 1, textAlign: 'center' }}>
            Summer Showdown
          </Title>
          <div style={{ width: '40px' }} />
        </Header>

        <Drawer
          placement="left"
          onClose={() => setDrawerOpen(false)}
          open={drawerOpen}
          closeIcon={<span style={{ fontSize: 18 }}>✕</span>}
          width={240}
          styles={{ header: { padding: '16px 20px', borderBottom: 'none' }, body: { padding: 0 } }}
        >
          <Menu
            items={menuItems}
            onClick={(e) => handleMenuClick(e.key)}
            selectedKeys={[currentPage]}
            style={{ border: 'none' }}
          />
        </Drawer>

        <Content style={{ padding: '32px 24px', maxWidth: 1400, margin: '0 auto', width: '100%', backgroundColor: '#f5f5f5', minHeight: 'calc(100vh - 64px)' }}>
          {renderPage()}
        </Content>
      </Layout>
    </ConfigProvider>
  )
}

export default App
