import { useState } from 'react'
import { Tabs, Button, Table, Space, Popconfirm, message, Modal, Form, Input, Select } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { referenceService } from '../services/references'

const { TabPane } = Tabs

function ReferenceTable({ columns, data, loading, onEdit, onDelete }) {
  return (
    <Table
      columns={[
        ...columns,
        {
          title: 'Действия',
          key: 'actions',
          render: (_, record) => (
            <Space>
              <Button icon={<EditOutlined />} onClick={() => onEdit(record)}>
                Редактировать
              </Button>
              <Popconfirm title="Удалить?" onConfirm={() => onDelete(record.id)}>
                <Button danger icon={<DeleteOutlined />}>
                  Удалить
                </Button>
              </Popconfirm>
            </Space>
          ),
        },
      ]}
      dataSource={data}
      rowKey="id"
      loading={loading}
    />
  )
}

export default function References() {
  const queryClient = useQueryClient()
  const [modalVisible, setModalVisible] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [activeTab, setActiveTab] = useState('deviceTypes')
  const [form] = Form.useForm()

  const { data: companies = [], isLoading: companiesLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: () => referenceService.getCompanies(),
  })

  const { data: deviceTypes = [], isLoading: deviceTypesLoading } = useQuery({
    queryKey: ['deviceTypes'],
    queryFn: () => referenceService.getDeviceTypes(),
  })

  const { data: brands = [], isLoading: brandsLoading } = useQuery({
    queryKey: ['brands'],
    queryFn: () => referenceService.getBrands(),
  })

  const { data: models = [], isLoading: modelsLoading } = useQuery({
    queryKey: ['models'],
    queryFn: () => referenceService.getModels(),
  })

  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => referenceService.getEmployees(),
  })

  const { data: warehouses = [], isLoading: warehousesLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => referenceService.getWarehouses(),
  })

  const createMutation = useMutation({
    mutationFn: (data) => {
      switch (activeTab) {
        case 'companies':
          return referenceService.createCompany(data)
        case 'deviceTypes':
          return referenceService.createDeviceType(data)
        case 'brands':
          return referenceService.createBrand(data)
        case 'models':
          return referenceService.createModel(data)
        case 'employees':
          return referenceService.createEmployee(data)
        case 'warehouses':
          return referenceService.createWarehouse(data)
      }
    },
    onSuccess: () => {
      message.success('Создано')
      queryClient.invalidateQueries()
      setModalVisible(false)
      form.resetFields()
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.detail || 'Ошибка создания'
      message.error(errorMessage)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => {
      switch (activeTab) {
        case 'companies':
          return referenceService.updateCompany(id, data)
        case 'deviceTypes':
          return referenceService.updateDeviceType(id, data)
        case 'brands':
          return referenceService.updateBrand(id, data)
        case 'models':
          return referenceService.updateModel(id, data)
        case 'employees':
          return referenceService.updateEmployee(id, data)
        case 'warehouses':
          return referenceService.updateWarehouse(id, data)
      }
    },
    onSuccess: () => {
      message.success('Обновлено')
      queryClient.invalidateQueries()
      setModalVisible(false)
      setEditingItem(null)
      form.resetFields()
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.detail || 'Ошибка обновления'
      message.error(errorMessage)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => {
      switch (activeTab) {
        case 'companies':
          return referenceService.deleteCompany(id)
        case 'deviceTypes':
          return referenceService.deleteDeviceType(id)
        case 'brands':
          return referenceService.deleteBrand(id)
        case 'models':
          return referenceService.deleteModel(id)
        case 'employees':
          return referenceService.deleteEmployee(id)
        case 'warehouses':
          return referenceService.deleteWarehouse(id)
      }
    },
    onSuccess: () => {
      message.success('Удалено')
      queryClient.invalidateQueries()
    },
  })

  const handleEdit = (item) => {
    setEditingItem(item)
    form.setFieldsValue(item)
    setModalVisible(true)
  }

  const handleAdd = () => {
    setEditingItem(null)
    form.resetFields()
    // Устанавливаем статус по умолчанию для новых сотрудников
    if (activeTab === 'employees') {
      form.setFieldsValue({ status: 'active' })
    }
    setModalVisible(true)
  }

  const handleSubmit = (values) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: values })
    } else {
      createMutation.mutate(values)
    }
  }

  const renderForm = () => {
    switch (activeTab) {
      case 'companies':
        return (
          <>
            <Form.Item name="name" label="Название" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item 
              name="code" 
              label="Код (3 символа)" 
              rules={[{ required: true, len: 3, message: 'Код должен состоять из 3 символов' }]}
            >
              <Input maxLength={3} style={{ textTransform: 'uppercase' }} />
            </Form.Item>
            <Form.Item name="description" label="Описание">
              <Input.TextArea />
            </Form.Item>
          </>
        )
      case 'deviceTypes':
        return (
          <>
            <Form.Item name="name" label="Название" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item 
              name="code" 
              label="Код (2 цифры)" 
              rules={[{ required: true, len: 2, pattern: /^\d{2}$/, message: 'Код должен состоять из 2 цифр' }]}
            >
              <Input maxLength={2} />
            </Form.Item>
            <Form.Item name="description" label="Описание">
              <Input.TextArea />
            </Form.Item>
          </>
        )
      case 'brands':
        return (
          <Form.Item name="name" label="Название" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        )
      case 'models':
        return (
          <>
            <Form.Item name="brand_id" label="Бренд" rules={[{ required: true }]}>
              <Select>
                {brands.map(b => (
                  <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="name" label="Название" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </>
        )
      case 'employees':
        return (
          <>
            <Form.Item name="full_name" label="ФИО" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="phone_extension" label="Телефонный номер (3 цифры)" rules={[{ required: true, len: 3 }]}>
              <Input maxLength={3} />
            </Form.Item>
            <Form.Item name="status" label="Статус" rules={[{ required: true }]}>
              <Select>
                <Select.Option value="active">Работает</Select.Option>
                <Select.Option value="fired">Уволен</Select.Option>
              </Select>
            </Form.Item>
          </>
        )
      case 'warehouses':
        return (
          <>
            <Form.Item name="name" label="Название" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="address" label="Адрес">
              <Input />
            </Form.Item>
          </>
        )
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h1>Справочники</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Добавить
        </Button>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="Компании" key="companies">
          <ReferenceTable
            columns={[
              { title: 'Название', dataIndex: 'name', key: 'name' },
              { title: 'Код', dataIndex: 'code', key: 'code' },
              { title: 'Описание', dataIndex: 'description', key: 'description' },
            ]}
            data={companies}
            loading={companiesLoading}
            onEdit={handleEdit}
            onDelete={deleteMutation.mutate}
          />
        </TabPane>
        <TabPane tab="Типы устройств" key="deviceTypes">
          <ReferenceTable
            columns={[
              { title: 'Название', dataIndex: 'name', key: 'name' },
              { title: 'Код', dataIndex: 'code', key: 'code' },
              { title: 'Описание', dataIndex: 'description', key: 'description' },
            ]}
            data={deviceTypes}
            loading={deviceTypesLoading}
            onEdit={handleEdit}
            onDelete={deleteMutation.mutate}
          />
        </TabPane>
        <TabPane tab="Бренды" key="brands">
          <ReferenceTable
            columns={[{ title: 'Название', dataIndex: 'name', key: 'name' }]}
            data={brands}
            loading={brandsLoading}
            onEdit={handleEdit}
            onDelete={deleteMutation.mutate}
          />
        </TabPane>
        <TabPane tab="Модели" key="models">
          <ReferenceTable
            columns={[
              { title: 'Бренд', dataIndex: 'brand_id', key: 'brand_id', render: (id) => brands.find(b => b.id === id)?.name },
              { title: 'Название', dataIndex: 'name', key: 'name' },
            ]}
            data={models}
            loading={modelsLoading}
            onEdit={handleEdit}
            onDelete={deleteMutation.mutate}
          />
        </TabPane>
        <TabPane tab="Сотрудники" key="employees">
          <ReferenceTable
            columns={[
              { title: 'ФИО', dataIndex: 'full_name', key: 'full_name' },
              { title: 'Телефон', dataIndex: 'phone_extension', key: 'phone_extension' },
              { 
                title: 'Статус', 
                dataIndex: 'status', 
                key: 'status',
                render: (status) => status === 'active' ? 'Работает' : 'Уволен',
                filters: [
                  { text: 'Работает', value: 'active' },
                  { text: 'Уволен', value: 'fired' },
                ],
                onFilter: (value, record) => record.status === value,
              },
            ]}
            data={employees}
            loading={employeesLoading}
            onEdit={handleEdit}
            onDelete={deleteMutation.mutate}
          />
        </TabPane>
        <TabPane tab="Склады" key="warehouses">
          <ReferenceTable
            columns={[
              { title: 'Название', dataIndex: 'name', key: 'name' },
              { title: 'Адрес', dataIndex: 'address', key: 'address' },
            ]}
            data={warehouses}
            loading={warehousesLoading}
            onEdit={handleEdit}
            onDelete={deleteMutation.mutate}
          />
        </TabPane>
      </Tabs>

      <Modal
        title={editingItem ? 'Редактировать' : 'Создать'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          setEditingItem(null)
          form.resetFields()
        }}
        footer={null}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          {renderForm()}
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
                {editingItem ? 'Сохранить' : 'Создать'}
              </Button>
              <Button onClick={() => {
                setModalVisible(false)
                setEditingItem(null)
                form.resetFields()
              }}>
                Отмена
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

