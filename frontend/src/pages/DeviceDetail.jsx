import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, Descriptions, Table, Button, Space, Tag, Modal, Select, Checkbox, Alert } from 'antd'
import { useParams, useNavigate } from 'react-router-dom'
import { EditOutlined, ArrowLeftOutlined, SwapOutlined, PrinterOutlined } from '@ant-design/icons'
import { deviceService } from '../services/devices'
import { movementService } from '../services/movements'
import { referenceService } from '../services/references'
import { labelService } from '../services/labels'

export default function DeviceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [printModalVisible, setPrintModalVisible] = useState(false)
  const [labelFormat, setLabelFormat] = useState('38x21')
  const [autoPrint, setAutoPrint] = useState(false)

  const { data: device, isLoading: deviceLoading } = useQuery({
    queryKey: ['device', id],
    queryFn: () => deviceService.getById(id),
  })

  const { data: movements = [], isLoading: movementsLoading } = useQuery({
    queryKey: ['movements', id],
    queryFn: () => movementService.getAll({ device_id: id }),
    enabled: !!id,
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
    queryKey: ['models'],
    queryFn: () => referenceService.getModels(),
  })

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => referenceService.getEmployees(),
  })

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => referenceService.getWarehouses(),
  })

  if (deviceLoading) {
    return <div>Загрузка...</div>
  }

  if (!device) {
    return <div>Устройство не найдено</div>
  }

  const deviceType = deviceTypes.find(t => t.id === device.device_type_id)
  const brand = brands.find(b => b.id === device.brand_id)
  const model = models.find(m => m.id === device.model_id)

  const getLocationName = (locationType, locationId) => {
    if (locationType === 'employee') {
      const employee = employees.find(e => e.id === locationId)
      return employee ? `${employee.full_name} (${employee.phone_extension})` : `Сотрудник #${locationId}`
    } else {
      const warehouse = warehouses.find(w => w.id === locationId)
      return warehouse ? warehouse.name : `Склад #${locationId}`
    }
  }

  const movementColumns = [
    {
      title: 'Дата',
      dataIndex: 'moved_at',
      key: 'moved_at',
      render: (date) => new Date(date).toLocaleString('ru-RU'),
      sorter: (a, b) => new Date(a.moved_at) - new Date(b.moved_at),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Откуда',
      key: 'from',
      render: (_, record) => {
        if (!record.from_location_type) {
          return <Tag color="blue">Новое устройство</Tag>
        }
        return getLocationName(record.from_location_type, record.from_location_id)
      },
    },
    {
      title: 'Куда',
      key: 'to',
      render: (_, record) => {
        return (
          <Tag color={record.to_location_type === 'employee' ? 'green' : 'orange'}>
            {getLocationName(record.to_location_type, record.to_location_id)}
          </Tag>
        )
      },
    },
  ]

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/devices')}>
          Назад к списку
        </Button>
        <Button
          icon={<EditOutlined />}
          onClick={() => navigate(`/devices/${id}/edit`)}
        >
          Редактировать
        </Button>
        <Button
          icon={<PrinterOutlined />}
          onClick={() => setPrintModalVisible(true)}
        >
          Печать наклейки
        </Button>
        <Button
          type="primary"
          icon={<SwapOutlined />}
          onClick={() => navigate('/movements', { state: { deviceId: id } })}
        >
          Переместить
        </Button>
      </Space>

      <Card title={`Устройство #${device.inventory_number}`} style={{ marginBottom: 24 }}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="Инвентарный номер">
            {device.inventory_number}
          </Descriptions.Item>
          <Descriptions.Item label="Серийный номер">
            {device.serial_number}
          </Descriptions.Item>
          <Descriptions.Item label="Тип устройства">
            {deviceType?.name || 'Не указан'}
          </Descriptions.Item>
          <Descriptions.Item label="Бренд">
            {brand?.name || 'Не указан'}
          </Descriptions.Item>
          <Descriptions.Item label="Модель">
            {model?.name || 'Не указана'}
          </Descriptions.Item>
          <Descriptions.Item label="Текущая локация">
            <Tag color={device.current_location_type === 'employee' ? 'green' : 'orange'}>
              {getLocationName(device.current_location_type, device.current_location_id)}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Дата создания">
            {new Date(device.created_at).toLocaleString('ru-RU')}
          </Descriptions.Item>
          {device.updated_at && (
            <Descriptions.Item label="Дата обновления">
              {new Date(device.updated_at).toLocaleString('ru-RU')}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Card title="История перемещений">
        <Table
          columns={movementColumns}
          dataSource={movements}
          rowKey="id"
          loading={movementsLoading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Всего: ${total}`,
          }}
          locale={{
            emptyText: 'Нет перемещений',
          }}
        />
      </Card>

      <Modal
        title="Печать наклейки"
        open={printModalVisible}
        onOk={() => {
          labelService.printLabels([id], labelFormat, autoPrint)
          setPrintModalVisible(false)
          setAutoPrint(false)
        }}
        onCancel={() => setPrintModalVisible(false)}
        okText="Печать"
        cancelText="Отмена"
      >
        <div style={{ marginBottom: 16 }}>
          <p>Устройство: <strong>#{device.inventory_number}</strong></p>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8 }}>
            Формат наклейки:
          </label>
          <Select
            value={labelFormat}
            onChange={setLabelFormat}
            style={{ width: '100%' }}
          >
            <Select.Option value="38x21">
              38x21 мм (Avery L7159) - 24 наклейки на A4
            </Select.Option>
            <Select.Option value="50x25">
              50x25 мм - 21 наклейка на A4
            </Select.Option>
            <Select.Option value="70x36">
              70x36 мм (Avery L7160) - 12 наклеек на A4
            </Select.Option>
            <Select.Option value="100x50">
              100x50 мм - 8 наклеек на A4
            </Select.Option>
          </Select>
        </div>
        
        <div style={{ marginBottom: 16 }}>
          <Checkbox
            checked={autoPrint}
            onChange={(e) => setAutoPrint(e.target.checked)}
          >
            Автоматически открыть диалог печати
          </Checkbox>
          <p style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
            Если отмечено, диалог печати откроется автоматически. 
            Если не отмечено, откроется предпросмотр с кнопкой "Печать", где вы сможете выбрать принтер.
          </p>
        </div>

        <Alert
          message="Выбор принтера"
          description={
            <div>
              <p style={{ marginBottom: 8 }}>
                После нажатия "Печать" откроется окно предпросмотра или диалог печати.
              </p>
              <p style={{ marginBottom: 4 }}><strong>В диалоге печати вы сможете:</strong></p>
              <ul style={{ marginLeft: 20, marginBottom: 0 }}>
                <li>Выбрать нужный принтер из списка</li>
                <li>Настроить параметры печати (количество копий, масштаб)</li>
                <li>Выбрать формат бумаги</li>
              </ul>
            </div>
          }
          type="info"
          showIcon
          style={{ marginTop: 16 }}
        />
        
        <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
          <p style={{ margin: 0, fontSize: 12 }}>
            <strong>💡 Совет:</strong> Убедитесь, что в выбранном принтере установлена бумага для наклеек формата {labelFormat} мм.
          </p>
        </div>
      </Modal>
    </div>
  )
}

