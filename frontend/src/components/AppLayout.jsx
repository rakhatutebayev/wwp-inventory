import { useState, useEffect } from 'react'
import { Layout, Menu, Button, Select } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  DashboardOutlined,
  LaptopOutlined,
  DatabaseOutlined,
  SwapOutlined,
  FileTextOutlined,
  LogoutOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import i18n from '../i18n'

const { Header, Sider, Content } = Layout

export default function AppLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false)
  const [locale, setLocaleState] = useState(i18n.getLocale())
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const handleLocaleChange = () => {
      setLocaleState(i18n.getLocale())
    }
    window.addEventListener('localechange', handleLocaleChange)
    return () => window.removeEventListener('localechange', handleLocaleChange)
  }, [])

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: 'Дашборд',
    },
    {
      key: '/devices',
      icon: <LaptopOutlined />,
      label: i18n.t('devices.title'),
    },
    {
      key: '/references',
      icon: <DatabaseOutlined />,
      label: 'Справочники',
    },
    {
      key: '/movements',
      icon: <SwapOutlined />,
      label: 'Перемещения',
    },
    {
      key: '/reports',
      icon: <FileTextOutlined />,
      label: 'Отчеты',
    },
    {
      key: '/inventory',
      icon: <CheckCircleOutlined />,
      label: 'Инвентаризация',
    },
  ]

  const handleMenuClick = ({ key }) => {
    navigate(key)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  const handleLocaleChange = (value) => {
    i18n.setLocale(value)
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div style={{ 
          height: 32, 
          margin: 16, 
          background: 'rgba(255, 255, 255, 0.3)',
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold',
        }}>
          {collapsed ? 'WWP' : 'WWP Inventory'}
        </div>
        <Menu
          theme="dark"
          selectedKeys={[location.pathname]}
          mode="inline"
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header style={{ 
          background: '#fff', 
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '16px',
        }}>
          <Select
            value={locale}
            onChange={handleLocaleChange}
            style={{ width: 120 }}
            options={[
              { value: 'ru', label: i18n.t('settings.russian') },
              { value: 'en', label: i18n.t('settings.english') },
            ]}
          />
          <Button 
            type="text" 
            icon={<LogoutOutlined />}
            onClick={handleLogout}
          >
            {i18n.t('auth.logout')}
          </Button>
        </Header>
        <Content style={{ margin: '24px 16px', padding: 24, background: '#fff', minHeight: 280 }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}


