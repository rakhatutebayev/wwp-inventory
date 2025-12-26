import { useState } from 'react'
import { Form, Input, Button, Card, message, Select } from 'antd'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/auth'
import i18n from '../i18n'

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [locale, setLocale] = useState(i18n.getLocale())
  const navigate = useNavigate()

  const onFinish = async (values) => {
    setLoading(true)
    try {
      const response = await authService.login(values.username, values.password)
      localStorage.setItem('token', response.access_token)
      message.success(i18n.t('common.success'))
      navigate('/')
    } catch (error) {
      message.error(error.response?.data?.detail || i18n.t('auth.loginError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: '#f0f2f5',
    }}>
      <Card 
        title={`WWP Inventory - ${i18n.t('auth.login')}`} 
        style={{ width: 400 }}
        extra={
          <Select
            value={locale}
            onChange={(value) => {
              i18n.setLocale(value)
              setLocale(value)
            }}
            style={{ width: 120 }}
            options={[
              { value: 'ru', label: i18n.t('settings.russian') },
              { value: 'en', label: i18n.t('settings.english') },
            ]}
          />
        }
      >
        <Form
          name="login"
          onFinish={onFinish}
          layout="vertical"
          autoComplete="off"
        >
          <Form.Item
            label={i18n.t('auth.username')}
            name="username"
            rules={[{ required: true, message: `Введите ${i18n.t('auth.username').toLowerCase()}` }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label={i18n.t('auth.password')}
            name="password"
            rules={[{ required: true, message: `Введите ${i18n.t('auth.password').toLowerCase()}` }]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              {i18n.t('auth.loginButton')}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}



