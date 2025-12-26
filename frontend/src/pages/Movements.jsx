import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Table, Button, Modal, Form, Select, message, Space, Tag } from 'antd'
import { PlusOutlined, QrcodeOutlined } from '@ant-design/icons'
import { useLocation, useNavigate } from 'react-router-dom'
import { movementService } from '../services/movements'
import { deviceService } from '../services/devices'
import { referenceService } from '../services/references'
import QRScanner from '../components/QRScanner'

export default function Movements() {
  const [modalVisible, setModalVisible] = useState(false)
  const [qrScannerVisible, setQrScannerVisible] = useState(false)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const location = useLocation()
  const navigate = useNavigate()
  
  // Получаем deviceId из state при переходе с детальной страницы устройства
  const deviceIdFromState = location.state?.deviceId

  const { data: movements = [], isLoading } = useQuery({
    queryKey: ['movements'],
    queryFn: () => movementService.getAll(),
  })

  const { data: devices = [] } = useQuery({
    queryKey: ['devices'],
    queryFn: () => deviceService.getAll(),
  })

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => referenceService.getEmployees(),
  })

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => referenceService.getWarehouses(),
  })

  // Получаем устройства выбранного сотрудника
  const { data: employeeDevices = [] } = useQuery({
    queryKey: ['employeeDevices', selectedEmployeeId],
    queryFn: () => referenceService.getEmployeeDevices(selectedEmployeeId),
    enabled: !!selectedEmployeeId,
  })

  const createMutation = useMutation({
    mutationFn: movementService.create,
    onSuccess: () => {
      message.success('Перемещение создано')
      queryClient.invalidateQueries(['movements'])
      queryClient.invalidateQueries(['devices'])
      setModalVisible(false)
      form.resetFields()
    },
    onError: (error) => {
      message.error(error.response?.data?.detail || 'Ошибка создания перемещения')
    },
  })

  // Автоматически открываем модальное окно и выбираем устройство если перешли с детальной страницы
  useEffect(() => {
    if (deviceIdFromState) {
      setModalVisible(true)
      form.setFieldsValue({ device_id: deviceIdFromState })
      // Очищаем state чтобы не открывать модальное окно при следующем обновлении
      window.history.replaceState({}, document.title)
    }
  }, [deviceIdFromState, form])

  const handleSubmit = (values) => {
    createMutation.mutate(values)
  }

  const handleQRScan = async (inventoryNumber) => {
    try {
      const device = await deviceService.getByInventoryNumber(inventoryNumber)
      form.setFieldsValue({ device_id: device.id })
      setQrScannerVisible(false)
      message.success(`Устройство найдено: ${device.inventory_number}`)
    } catch (error) {
      message.error(error.response?.data?.detail || 'Устройство не найдено')
    }
  }

  const handleEmployeeChange = (employeeId) => {
    setSelectedEmployeeId(employeeId)
    form.setFieldsValue({ to_location_id: employeeId })
  }

  const columns = [
    {
      title: 'Устройство',
      key: 'device',
      render: (_, record) => {
        const device = devices.find(d => d.id === record.device_id)
        if (device) {
          return (
            <Button
              type="link"
              onClick={() => navigate(`/devices/${device.id}`)}
            >
              #{device.inventory_number}
            </Button>
          )
        }
        return record.device_id
      },
    },
    {
      title: 'Откуда',
      key: 'from',
      render: (_, record) => {
        if (!record.from_location_type) return 'Новая'
        return record.from_location_type === 'employee'
          ? `Сотрудник #${record.from_location_id}`
          : `Склад #${record.from_location_id}`
      },
    },
    {
      title: 'Куда',
      key: 'to',
      render: (_, record) => {
        return record.to_location_type === 'employee'
          ? `Сотрудник #${record.to_location_id}`
          : `Склад #${record.to_location_id}`
      },
    },
    {
      title: 'Дата',
      dataIndex: 'moved_at',
      key: 'moved_at',
      render: (date) => new Date(date).toLocaleString('ru-RU'),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h1>Перемещения</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
          Создать перемещение
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={movements}
        rowKey="id"
        loading={isLoading}
      />

      <Modal
        title="Создать перемещение"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
        }}
        footer={null}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item
            name="device_id"
            label="Устройство"
            rules={[{ required: true, message: 'Выберите устройство' }]}
          >
            <Space.Compact style={{ width: '100%' }}>
              <Select
                style={{ flex: 1 }}
                showSearch
                placeholder="Выберите устройство"
                optionFilterProp="children"
                filterOption={(input, option) =>
                  (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                }
              >
                {devices.map(device => (
                  <Select.Option key={device.id} value={device.id}>
                    #{device.inventory_number} - {device.serial_number}
                  </Select.Option>
                ))}
              </Select>
              <Button
                icon={<QrcodeOutlined />}
                onClick={() => setQrScannerVisible(true)}
                title="Сканировать QR-код"
              >
                QR
              </Button>
            </Space.Compact>
          </Form.Item>

          <Form.Item
            name="to_location_type"
            label="Тип локации назначения"
            rules={[{ required: true, message: 'Выберите тип локации' }]}
          >
            <Select>
              <Select.Option value="warehouse">Склад</Select.Option>
              <Select.Option value="employee">Сотрудник</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.to_location_type !== currentValues.to_location_type
            }
          >
            {({ getFieldValue }) => {
              const locationType = getFieldValue('to_location_type')
              // Сбрасываем выбранного сотрудника при смене типа локации
              if (locationType !== 'employee' && selectedEmployeeId) {
                setSelectedEmployeeId(null)
              }
              return (
                <>
                  <Form.Item
                    name="to_location_id"
                    label={locationType === 'employee' ? 'Сотрудник' : 'Склад'}
                    rules={[{ required: true, message: 'Выберите локацию' }]}
                  >
                    <Select
                      onChange={locationType === 'employee' ? handleEmployeeChange : undefined}
                      showSearch
                      placeholder={locationType === 'employee' ? 'Выберите сотрудника' : 'Выберите склад'}
                      optionFilterProp="children"
                      filterOption={(input, option) =>
                        (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                    >
                      {locationType === 'employee'
                        ? employees
                            .filter(emp => emp.status === 'active')
                            .map(emp => (
                              <Select.Option key={emp.id} value={emp.id}>
                                {emp.full_name} ({emp.phone_extension})
                              </Select.Option>
                            ))
                        : warehouses.map(wh => (
                            <Select.Option key={wh.id} value={wh.id}>
                              {wh.name}
                            </Select.Option>
                          ))}
                    </Select>
                  </Form.Item>
                  {locationType === 'employee' && selectedEmployeeId && employeeDevices.length > 0 && (
                    <Form.Item label="Устройства у сотрудника:">
                      <div style={{ marginTop: 8 }}>
                        {employeeDevices.map(device => (
                          <Tag key={device.id} color="blue" style={{ marginBottom: 4 }}>
                            {device.inventory_number}
                          </Tag>
                        ))}
                      </div>
                    </Form.Item>
                  )}
                </>
              )
            }}
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending}>
                Создать
              </Button>
              <Button onClick={() => {
                setModalVisible(false)
                form.resetFields()
              }}>
                Отмена
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <QRScanner
        visible={qrScannerVisible}
        onScan={handleQRScan}
        onCancel={() => setQrScannerVisible(false)}
      />
    </div>
  )
}

