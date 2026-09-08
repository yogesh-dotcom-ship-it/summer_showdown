import { useState } from 'react'
import { ConfigProvider, Layout, Typography, Button, Drawer, Menu } from 'antd'
import { MenuOutlined } from '@ant-design/icons'
import RegistrationTab from './components/RegistrationTab'
import ScanTab from './components/ScanTab'
import DashboardTab from './components/DashboardTab'

const { Header, Content } = Layout
const { Title } = Typography

function App() {
  const [currentPage, setCurrentPage] = useState('register')
  const [drawerOpen, setDrawerOpen] = useState(false)

  const menuItems = [
    { key: 'register', label: 'Registration' },
    { key: 'scan', label: 'Scan QR' },
    { key: 'dashboard', label: 'Dashboard' },
  ]

  const handleMenuClick = (key) => {
    setCurrentPage(key)
    setDrawerOpen(false)
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'register':
        return <RegistrationTab />
      case 'scan':
        return <ScanTab />
      case 'dashboard':
        return <DashboardTab />
      default:
        return <RegistrationTab />
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
          title="Menu"
          placement="left"
          onClose={() => setDrawerOpen(false)}
          open={drawerOpen}
        >
          <Menu
            items={menuItems}
            onClick={(e) => handleMenuClick(e.key)}
            selectedKeys={[currentPage]}
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
