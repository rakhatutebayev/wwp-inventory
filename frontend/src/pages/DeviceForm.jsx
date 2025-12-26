import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Form, Input, Select, Button, message, Card, Space, Tag } from 'antd'
import { QrcodeOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { deviceService } from '../services/devices'
import { referenceService } from '../services/references'
import QRScanner from '../components/QRScanner'

export default function DeviceForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const [selectedBrand, setSelectedBrand] = useState(null)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null)
  const [qrScannerVisible, setQrScannerVisible] = useState(false)

  const { data: device, isLoading } = useQuery({
    queryKey: ['device', id],
    queryFn: () => deviceService.getById(id),
    enabled: !!id,
  })

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => referenceService.getCompanies(),
  })

  const { data: deviceTypes = [] } = useQuery({
    queryKey: ['deviceTypes'],
    queryFn: () => referenceService.getDeviceTypes(),
  })

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: () => referenceService.getBrands(),
  })

  const { data: models = [] } = useQuery({
    queryKey: ['models', selectedBrand],
    queryFn: () => referenceService.getModels(selectedBrand),
    enabled: !!selectedBrand,
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

  useEffect(() => {
    if (device) {
      form.setFieldsValue(device)
      setSelectedBrand(device.brand_id)
      if (device.current_location_type === 'employee') {
        setSelectedEmployeeId(device.current_location_id)
      }
    }
  }, [device, form])

  const handleQRScan = async (inventoryNumber) => {
    try {
      const scannedDevice = await deviceService.getByInventoryNumber(inventoryNumber)
      navigate(`/devices/${scannedDevice.id}`)
      setQrScannerVisible(false)
    } catch (error) {
      message.error(error.response?.data?.detail || 'Устройство не найдено')
    }
  }

  const handleEmployeeChange = (employeeId) => {
    setSelectedEmployeeId(employeeId)
  }

  const createMutation = useMutation({
    mutationFn: deviceService.create,
    onSuccess: () => {
      message.success('Устройство создано')
      queryClient.invalidateQueries(['devices'])
      navigate('/devices')
    },
    onError: (error) => {
      message.error(error.response?.data?.detail || 'Ошибка создания')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data) => deviceService.update(id, data),
    onSuccess: () => {
      message.success('Устройство обновлено')
      queryClient.invalidateQueries(['devices'])
      navigate('/devices')
    },
    onError: (error) => {
      message.error(error.response?.data?.detail || 'Ошибка обновления')
    },
  })

  const onFinish = (values) => {
    if (id) {
      updateMutation.mutate(values)
    } else {
      createMutation.mutate(values)
    }
  }

  return (
    <Card title={id ? 'Редактировать устройство' : 'Создать устройство'}>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        loading={isLoading}
      >
        <Form.Item
          name="company_id"
          label="Компания"
          rules={[{ required: true, message: 'Выберите компанию' }]}
        >
          <Select>
            {companies.map(company => (
              <Select.Option key={company.id} value={company.id}>
                {company.name} ({company.code})
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="device_type_id"
          label="Тип устройства"
          rules={[{ required: true, message: 'Выберите тип устройства' }]}
        >
          <Select>
            {deviceTypes.map(type => (
              <Select.Option key={type.id} value={type.id}>
                {type.name} ({type.code})
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="brand_id"
          label="Бренд"
          rules={[{ required: true, message: 'Выберите бренд' }]}
        >
          <Select onChange={(value) => setSelectedBrand(value)}>
            {brands.map(brand => (
              <Select.Option key={brand.id} value={brand.id}>
                {brand.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="model_id"
          label="Модель"
          rules={[{ required: true, message: 'Выберите модель' }]}
        >
          <Select disabled={!selectedBrand}>
            {models.map(model => (
              <Select.Option key={model.id} value={model.id}>
                {model.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="serial_number"
          label="Серийный номер"
          rules={[{ required: true, message: 'Введите серийный номер' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="inventory_number"
          label="Инвентарный номер"
          tooltip="Оставьте пустым для автоматической генерации"
        >
          <Space.Compact style={{ width: '100%' }}>
            <Input placeholder="Автоматически сгенерируется, если не указан" />
            <Button
              icon={<QrcodeOutlined />}
              onClick={() => setQrScannerVisible(true)}
              title="Сканировать QR-код для поиска устройства"
            >
              QR
            </Button>
          </Space.Compact>
        </Form.Item>

        <Form.Item
          name="current_location_type"
          label="Тип локации"
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
            prevValues.current_location_type !== currentValues.current_location_type
          }
        >
          {({ getFieldValue }) => {
            const locationType = getFieldValue('current_location_type')
            // Сбрасываем выбранного сотрудника при смене типа локации
            if (locationType !== 'employee' && selectedEmployeeId) {
              setSelectedEmployeeId(null)
            }
            return (
              <>
                <Form.Item
                  name="current_location_id"
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
            <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
              {id ? 'Сохранить' : 'Создать'}
            </Button>
            <Button onClick={() => navigate('/devices')}>
              Отмена
            </Button>
          </Space>
        </Form.Item>
      </Form>

      <QRScanner
        visible={qrScannerVisible}
        onScan={handleQRScan}
        onCancel={() => setQrScannerVisible(false)}
      />
    </Card>
  )
}

