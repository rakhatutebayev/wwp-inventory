import { useQuery } from '@tanstack/react-query'
import { Card, Row, Col, Statistic } from 'antd'
import { LaptopOutlined, UserOutlined, ShopOutlined, SwapOutlined } from '@ant-design/icons'
import { deviceService } from '../services/devices'
import { movementService } from '../services/movements'
import { referenceService } from '../services/references'

export default function Dashboard() {
  const { data: devices = [] } = useQuery({
    queryKey: ['devices'],
    queryFn: () => deviceService.getAll(),
  })

  const { data: movements = [] } = useQuery({
    queryKey: ['movements'],
    queryFn: () => movementService.getAll({ limit: 10 }),
  })

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => referenceService.getEmployees(),
  })

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => referenceService.getWarehouses(),
  })

  const devicesOnEmployees = devices.filter(d => d.current_location_type === 'employee').length
  const devicesOnWarehouse = devices.filter(d => d.current_location_type === 'warehouse').length

  return (
    <div>
      <h1>Дашборд</h1>
      <Row gutter={16} style={{ marginTop: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Всего устройств"
              value={devices.length}
              prefix={<LaptopOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="У сотрудников"
              value={devicesOnEmployees}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="На складе"
              value={devicesOnWarehouse}
              prefix={<ShopOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Перемещений"
              value={movements.length}
              prefix={<SwapOutlined />}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}



