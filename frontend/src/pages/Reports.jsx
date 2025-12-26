import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, Table, Button, Select, message } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import { reportService } from '../services/reports'
import { referenceService } from '../services/references'

export default function Reports() {
  const [filters, setFilters] = useState({})

  const { data: devices = [], isLoading } = useQuery({
    queryKey: ['reportDevices', filters],
    queryFn: () => reportService.getDevices(filters),
  })

  const { data: locations = [] } = useQuery({
    queryKey: ['reportLocations', filters],
    queryFn: () => reportService.getLocations(filters),
  })

  const { data: deviceTypes = [] } = useQuery({
    queryKey: ['deviceTypes'],
    queryFn: () => referenceService.getDeviceTypes(),
  })

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: () => referenceService.getBrands(),
  })

  const handleExport = async () => {
    try {
      const blob = await reportService.exportDevices(filters)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'devices_report.csv'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      message.success('Отчет экспортирован')
    } catch (error) {
      message.error('Ошибка экспорта')
    }
  }

  const deviceColumns = [
    {
      title: 'Инв. номер',
      dataIndex: 'inventory_number',
      key: 'inventory_number',
    },
    {
      title: 'Серийный номер',
      dataIndex: 'serial_number',
      key: 'serial_number',
    },
    {
      title: 'Тип',
      dataIndex: 'device_type_id',
      key: 'device_type_id',
      render: (id) => {
        const type = deviceTypes.find(t => t.id === id)
        return type?.name || id
      },
    },
    {
      title: 'Бренд',
      dataIndex: 'brand_id',
      key: 'brand_id',
      render: (id) => {
        const brand = brands.find(b => b.id === id)
        return brand?.name || id
      },
    },
    {
      title: 'Локация',
      key: 'location',
      render: (_, record) => {
        return record.current_location_type === 'employee' 
          ? `Сотрудник #${record.current_location_id}`
          : `Склад #${record.current_location_id}`
      },
    },
  ]

  const locationColumns = [
    {
      title: 'Тип локации',
      dataIndex: 'location_type',
      key: 'location_type',
      render: (type) => type === 'employee' ? 'Сотрудник' : 'Склад',
    },
    {
      title: 'Название',
      dataIndex: 'location_name',
      key: 'location_name',
    },
    {
      title: 'Телефон',
      dataIndex: 'phone_extension',
      key: 'phone_extension',
    },
    {
      title: 'Количество устройств',
      dataIndex: 'device_count',
      key: 'device_count',
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h1>Отчеты</h1>
        <Button icon={<DownloadOutlined />} onClick={handleExport}>
          Экспорт в CSV
        </Button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Select
          placeholder="Тип устройства"
          style={{ width: 200, marginRight: 8 }}
          allowClear
          onChange={(value) => setFilters({ ...filters, device_type_id: value })}
        >
          {deviceTypes.map(type => (
            <Select.Option key={type.id} value={type.id}>
              {type.name}
            </Select.Option>
          ))}
        </Select>
        <Select
          placeholder="Бренд"
          style={{ width: 200 }}
          allowClear
          onChange={(value) => setFilters({ ...filters, brand_id: value })}
        >
          {brands.map(brand => (
            <Select.Option key={brand.id} value={brand.id}>
              {brand.name}
            </Select.Option>
          ))}
        </Select>
      </div>

      <Card title="Список устройств" style={{ marginBottom: 16 }}>
        <Table
          columns={deviceColumns}
          dataSource={devices}
          rowKey="id"
          loading={isLoading}
        />
      </Card>

      <Card title="Отчет по локациям">
        <Table
          columns={locationColumns}
          dataSource={locations}
          rowKey={(record) => `${record.location_type}-${record.location_id}`}
          loading={isLoading}
          expandable={{
            expandedRowRender: (record) => (
              <Table
                columns={[
                  { title: 'Инв. номер', dataIndex: 'inventory_number', key: 'inventory_number' },
                  { title: 'Серийный номер', dataIndex: 'serial_number', key: 'serial_number' },
                ]}
                dataSource={record.devices}
                rowKey="id"
                pagination={false}
                size="small"
              />
            ),
          }}
        />
      </Card>
    </div>
  )
}



