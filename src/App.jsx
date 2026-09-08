import { ConfigProvider, Layout, Tabs, Typography } from 'antd'
import RegistrationTab from './components/RegistrationTab'
import ScanTab from './components/ScanTab'
import DashboardTab from './components/DashboardTab'

const { Header, Content } = Layout
const { Title } = Typography

function App() {
  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#1677ff' } }}>
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ display: 'flex', alignItems: 'center' }}>
          <Title level={3} style={{ color: '#fff', margin: 0 }}>
            Summer Showdown
          </Title>
        </Header>
        <Content style={{ padding: '24px 16px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
          <Tabs
            defaultActiveKey="register"
            items={[
              { key: 'register', label: 'Registration', children: <RegistrationTab /> },
              { key: 'scan', label: 'Scan QR', children: <ScanTab /> },
              { key: 'dashboard', label: 'Dashboard', children: <DashboardTab /> },
            ]}
          />
        </Content>
      </Layout>
    </ConfigProvider>
  )
}

export default App
