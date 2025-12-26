import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Input,
  Progress,
  Tag,
  Space,
  message,
  Select,
  Row,
  Col,
  Statistic,
} from 'antd'
import {
  PlusOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import { inventoryService } from '../services/inventory'
import { referenceService } from '../services/references'

const { TextArea } = Input

export default function Inventory() {
  const queryClient = useQueryClient()
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [sessionDetailVisible, setSessionDetailVisible] = useState(false)
  const [selectedSessionId, setSelectedSessionId] = useState(null)
  const [form] = Form.useForm()

  // Получаем сессии
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['inventorySessions'],
    queryFn: () => inventoryService.getSessions(),
  })

  // Получаем типы устройств
  const { data: deviceTypes = [] } = useQuery({
    queryKey: ['deviceTypes'],
    queryFn: () => referenceService.getDeviceTypes(),
  })

  // Получаем выбранную сессию
  const { data: selectedSession } = useQuery({
    queryKey: ['inventorySession', selectedSessionId],
    queryFn: () => inventoryService.getSession(selectedSessionId),
    enabled: !!selectedSessionId,
  })

  // Получаем устройства выбранной сессии
  const { data: sessionDevices = [] } = useQuery({
    queryKey: ['inventorySessionDevices', selectedSessionId],
    queryFn: () => inventoryService.getSessionDevices(selectedSessionId),
    enabled: !!selectedSessionId,
  })

  // Получаем статистику выбранной сессии
  const { data: statistics } = useQuery({
    queryKey: ['inventoryStatistics', selectedSessionId],
    queryFn: () => inventoryService.getSessionStatistics(selectedSessionId),
    enabled: !!selectedSessionId,
  })

  // Мутация создания сессии
  const createSessionMutation = useMutation({
    mutationFn: inventoryService.createSession,
    onSuccess: () => {
      message.success('Сессия инвентаризации создана')
      queryClient.invalidateQueries(['inventorySessions'])
      setCreateModalVisible(false)
      form.resetFields()
    },
    onError: (error) => {
      message.error(error.response?.data?.detail || 'Ошибка при создании сессии')
    },
  })

  // Мутация отметки устройства
  const checkDeviceMutation = useMutation({
    mutationFn: ({ sessionId, deviceId, checked }) =>
      inventoryService.checkDevice(sessionId, deviceId, checked),
    onSuccess: () => {
      message.success('Устройство отмечено')
      queryClient.invalidateQueries(['inventorySessionDevices', selectedSessionId])
      queryClient.invalidateQueries(['inventoryStatistics', selectedSessionId])
    },
    onError: (error) => {
      message.error(error.response?.data?.detail || 'Ошибка при отметке устройства')
    },
  })

  const handleCreateSession = async (values) => {
    await createSessionMutation.mutateAsync(values)
  }

  const handleViewSession = (sessionId) => {
    setSelectedSessionId(sessionId)
    setSessionDetailVisible(true)
  }

  const handleToggleDevice = (deviceId, checked) => {
    checkDeviceMutation.mutate({
      sessionId: selectedSessionId,
      deviceId,
      checked: !checked,
    })
  }

  const sessionColumns = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusConfig = {
          active: { color: 'green', text: 'Активна' },
          completed: { color: 'blue', text: 'Завершена' },
          cancelled: { color: 'red', text: 'Отменена' },
        }
        const config = statusConfig[status] || { color: 'default', text: status }
        return <Tag color={config.color}>{config.text}</Tag>
      },
    },
    {
      title: 'Типы устройств',
      dataIndex: 'device_types',
      key: 'device_types',
      render: (deviceTypes) => deviceTypes.map((dt) => dt.name).join(', '),
    },
    {
      title: 'Создана',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => new Date(date).toLocaleString('ru-RU'),
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewSession(record.id)}
          >
            Просмотр
          </Button>
        </Space>
      ),
    },
  ]

  const deviceColumns = [
    {
      title: 'Инвентарный номер',
      dataIndex: ['device', 'inventory_number'],
      key: 'inventory_number',
    },
    {
      title: 'Серийный номер',
      dataIndex: ['device', 'serial_number'],
      key: 'serial_number',
    },
    {
      title: 'Статус',
      dataIndex: 'checked',
      key: 'checked',
      render: (checked) => (
        <Tag color={checked ? 'green' : 'default'}>
          {checked ? 'Проверено' : 'Не проверено'}
        </Tag>
      ),
    },
    {
      title: 'Дата проверки',
      dataIndex: 'checked_at',
      key: 'checked_at',
      render: (date) => (date ? new Date(date).toLocaleString('ru-RU') : '-'),
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_, record) => (
        <Button
          type={record.checked ? 'default' : 'primary'}
          icon={record.checked ? <ClockCircleOutlined /> : <CheckCircleOutlined />}
          onClick={() => handleToggleDevice(record.device.id, record.checked)}
        >
          {record.checked ? 'Снять отметку' : 'Отметить проверенным'}
        </Button>
      ),
    },
  ]

  return (
    <div>
      <Card
        title="Инвентаризация"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            Создать сессию
          </Button>
        }
      >
        <Table
          columns={sessionColumns}
          dataSource={sessions}
          rowKey="id"
          loading={sessionsLoading}
        />
      </Card>

      {/* Модальное окно создания сессии */}
      <Modal
        title="Создать сессию инвентаризации"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false)
          form.resetFields()
        }}
        onOk={() => form.submit()}
        confirmLoading={createSessionMutation.isPending}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateSession}
        >
          <Form.Item
            name="name"
            label="Название сессии"
            rules={[{ required: true, message: 'Введите название сессии' }]}
          >
            <Input placeholder="Например: Инвентаризация января 2025" />
          </Form.Item>
          <Form.Item name="description" label="Описание">
            <TextArea rows={3} placeholder="Описание сессии (необязательно)" />
          </Form.Item>
          <Form.Item
            name="device_type_ids"
            label="Типы устройств"
            rules={[{ required: true, message: 'Выберите хотя бы один тип устройства' }]}
          >
            <Select
              mode="multiple"
              placeholder="Выберите типы устройств"
              options={deviceTypes.map((dt) => ({
                label: `${dt.name} (${dt.code})`,
                value: dt.id,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Модальное окно деталей сессии */}
      <Modal
        title={selectedSession?.name || 'Детали сессии'}
        open={sessionDetailVisible}
        onCancel={() => {
          setSessionDetailVisible(false)
          setSelectedSessionId(null)
        }}
        footer={null}
        width={1000}
      >
        {statistics && (
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={8}>
              <Statistic
                title="Всего устройств"
                value={statistics.total_devices}
                prefix={<CheckCircleOutlined />}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="Проверено"
                value={statistics.checked_devices}
                valueStyle={{ color: '#3f8600' }}
                prefix={<CheckCircleOutlined />}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="Осталось"
                value={statistics.remaining_devices}
                valueStyle={{ color: '#cf1322' }}
                prefix={<ClockCircleOutlined />}
              />
            </Col>
          </Row>
        )}
        {statistics && (
          <Progress
            percent={statistics.progress_percent}
            status="active"
            style={{ marginBottom: 24 }}
          />
        )}
        <Table
          columns={deviceColumns}
          dataSource={sessionDevices}
          rowKey={(record) => record.id}
          pagination={{ pageSize: 20 }}
        />
      </Modal>
    </div>
  )
}

