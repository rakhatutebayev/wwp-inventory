import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Layout } from 'antd'
import { authService } from './services/auth'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Devices from './pages/Devices'
import DeviceDetail from './pages/DeviceDetail'
import DeviceForm from './pages/DeviceForm'
import References from './pages/References'
import Movements from './pages/Movements'
import Reports from './pages/Reports'
import Inventory from './pages/Inventory'
import AppLayout from './components/AppLayout'

const { Content } = Layout

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token')
  
  if (!token) {
    return <Navigate to="/login" replace />
  }
  
  return children
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <AppLayout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/devices" element={<Devices />} />
                  <Route path="/devices/new" element={<DeviceForm />} />
                  <Route path="/devices/:id" element={<DeviceDetail />} />
                  <Route path="/devices/:id/edit" element={<DeviceForm />} />
                  <Route path="/references" element={<References />} />
                  <Route path="/movements" element={<Movements />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/inventory" element={<Inventory />} />
                </Routes>
              </AppLayout>
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  )
}

export default App

