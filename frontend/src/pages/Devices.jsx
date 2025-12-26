import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Table, Button, Space, Popconfirm, message, Select, Input, Modal, Checkbox, Alert } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, PrinterOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { deviceService } from '../services/devices'
import { referenceService } from '../services/references'
import { labelService } from '../services/labels'

const { Search } = Input

export default function Devices() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState({})
  const [printModalVisible, setPrintModalVisible] = useState(false)
  const [selectedDevices, setSelectedDevices] = useState([])
  const [labelFormat, setLabelFormat] = useState('38x21')
  const [autoPrint, setAutoPrint] = useState(false)

  const { data: devices = [], isLoading } = useQuery({
    queryKey: ['devices', filters],
    queryFn: () => deviceService.getAll(filters),
  })

  const { data: deviceTypes = [] } = useQuery({
    queryKey: ['deviceTypes'],
    queryFn: () => referenceService.getDeviceTypes(),
  })

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: () => referenceService.getBrands(),
  })

  const deleteMutation = useMutation({
    mutationFn: deviceService.delete,
    onSuccess: () => {
      message.success('Устройство удалено')
      queryClient.invalidateQueries(['devices'])
    },
    onError: () => {
      message.error('Ошибка при удалении')
    },
  })

  const handlePrintLabels = () => {
    if (selectedDevices.length === 0) {
      message.warning('Выберите устройства для печати')
      return
    }
    labelService.printLabels(selectedDevices, labelFormat, autoPrint)
    setPrintModalVisible(false)
    setSelectedDevices([])
    setAutoPrint(false)
  }

  const rowSelection = {
    selectedRowKeys: selectedDevices,
    onChange: (selectedRowKeys) => {
      setSelectedDevices(selectedRowKeys)
    },
  }

  const columns = [
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
    {
      title: 'Действия',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            icon={<EyeOutlined />}
            onClick={() => navigate(`/devices/${record.id}`)}
          >
            Просмотр
          </Button>
          <Button
            icon={<EditOutlined />}
            onClick={() => navigate(`/devices/${record.id}/edit`)}
          >
            Редактировать
          </Button>
          <Popconfirm
            title="Удалить устройство?"
            onConfirm={() => deleteMutation.mutate(record.id)}
          >
            <Button danger icon={<DeleteOutlined />}>
              Удалить
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h1>Устройства</h1>
        <Space>
          {selectedDevices.length > 0 && (
            <Button
              icon={<PrinterOutlined />}
              onClick={() => setPrintModalVisible(true)}
            >
              Печать наклеек ({selectedDevices.length})
            </Button>
          )}
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/devices/new')}
          >
            Добавить устройство
          </Button>
        </Space>
      </div>

      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="Тип устройства"
          style={{ width: 200 }}
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
      </Space>

      <Table
        columns={columns}
        dataSource={devices}
        rowKey="id"
        loading={isLoading}
        rowSelection={rowSelection}
      />

      <Modal
        title="Печать наклеек"
        open={printModalVisible}
        onOk={handlePrintLabels}
        onCancel={() => {
          setPrintModalVisible(false)
          setSelectedDevices([])
        }}
        okText="Печать"
        cancelText="Отмена"
      >
        <div style={{ marginBottom: 16 }}>
          <p>Выбрано устройств: <strong>{selectedDevices.length}</strong></p>
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

