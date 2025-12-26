import React, { useState } from 'react'
import { View, ScrollView, StyleSheet, Alert } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card,
  Text,
  TextInput,
  Button,
  ActivityIndicator,
  Divider,
} from 'react-native-paper'
import { deviceService } from '../services/devices'
import { referenceService } from '../services/references'
import ReferencePicker from '../components/ReferencePicker'

export default function CreateDeviceScreen({ navigation }) {
  const [formData, setFormData] = useState({
    company_id: null,
    device_type_id: null,
    brand_id: null,
    model_id: null,
    serial_number: '',
    current_location_type: 'warehouse',
    current_location_id: null,
  })
  const queryClient = useQueryClient()

  // Получаем компании
  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => referenceService.getCompanies(),
  })

  // Получаем модели в зависимости от выбранного бренда
  const { data: models = [] } = useQuery({
    queryKey: ['models', formData.brand_id],
    queryFn: () => referenceService.getModels(formData.brand_id),
    enabled: !!formData.brand_id,
  })

  // Получаем сотрудников и склады
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => referenceService.getEmployees(),
  })

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => referenceService.getWarehouses(),
  })

  const createMutation = useMutation({
    mutationFn: (data) => deviceService.create(data),
    onSuccess: (device) => {
      queryClient.invalidateQueries(['devices'])
      Alert.alert(
        'Успех',
        `Устройство создано. Инвентарный номер: ${device.inventory_number}`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      )
    },
    onError: (error) => {
      Alert.alert('Ошибка', error.response?.data?.detail || 'Не удалось создать устройство')
    },
  })

  const handleSubmit = () => {
    // Валидация
    if (!formData.company_id) {
      Alert.alert('Ошибка', 'Выберите компанию')
      return
    }
    if (!formData.device_type_id) {
      Alert.alert('Ошибка', 'Выберите тип устройства')
      return
    }
    if (!formData.brand_id) {
      Alert.alert('Ошибка', 'Выберите бренд')
      return
    }
    if (!formData.model_id) {
      Alert.alert('Ошибка', 'Выберите модель')
      return
    }
    if (!formData.serial_number.trim()) {
      Alert.alert('Ошибка', 'Введите серийный номер')
      return
    }
    if (!formData.current_location_id) {
      Alert.alert('Ошибка', 'Выберите локацию')
      return
    }

    createMutation.mutate(formData)
  }

  const handleBrandChange = (brandId) => {
    setFormData({ ...formData, brand_id: brandId, model_id: null })
  }

  const handleLocationTypeChange = (locationType) => {
    setFormData({ ...formData, current_location_type: locationType, current_location_id: null })
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineSmall" style={styles.title}>
            Новое устройство
          </Text>

          <ReferencePicker
            label="Компания"
            referenceType="company"
            queryKey="companies"
            value={formData.company_id}
            onSelect={(id) => setFormData({ ...formData, company_id: id })}
            getLabel={(item) => item.name}
            getDescription={(item) => `Код: ${item.code}${item.description ? ` - ${item.description}` : ''}`}
            createFields={[
              { label: 'Название компании', key: 'name', required: true, autoFocus: true },
              { label: 'Код (3 символа)', key: 'code', required: true, maxLength: 3 },
              { label: 'Описание', key: 'description', required: false },
            ]}
            validation={(data) => {
              if (data.code && data.code.length !== 3) {
                return 'Код должен состоять из 3 символов'
              }
              return null
            }}
          />

          <ReferencePicker
            label="Тип устройства"
            referenceType="deviceType"
            queryKey="deviceTypes"
            value={formData.device_type_id}
            onSelect={(id) => setFormData({ ...formData, device_type_id: id })}
            getLabel={(item) => item.name}
            getDescription={(item) => `Код: ${item.code}`}
            createFields={[
              { label: 'Название', key: 'name', required: true },
              { label: 'Код (2 цифры)', key: 'code', required: true, type: 'numeric', maxLength: 2 },
              { label: 'Описание', key: 'description', required: false },
            ]}
            validation={(data) => {
              if (data.code && data.code.length !== 2) {
                return 'Код должен состоять из 2 цифр'
              }
              return null
            }}
          />

          <ReferencePicker
            label="Бренд"
            referenceType="brand"
            queryKey="brands"
            value={formData.brand_id}
            onSelect={handleBrandChange}
            getLabel={(item) => item.name}
            createFields={[
              { label: 'Название бренда', key: 'name', required: true, autoFocus: true },
            ]}
          />

          <ReferencePicker
            label="Модель"
            referenceType="model"
            queryKey="models"
            brandId={formData.brand_id}
            value={formData.model_id}
            onSelect={(id) => setFormData({ ...formData, model_id: id })}
            getLabel={(item) => item.name}
            createFields={[
              { label: 'Название модели', key: 'name', required: true, autoFocus: true },
            ]}
            onCreate={(newModel) => {
              // brand_id уже установлен, просто обновляем model_id
              setFormData({ ...formData, model_id: newModel.id })
            }}
          />

          <TextInput
            label="Серийный номер *"
            value={formData.serial_number}
            onChangeText={(text) => setFormData({ ...formData, serial_number: text })}
            mode="outlined"
            style={styles.input}
            autoCapitalize="none"
          />

          <Divider style={styles.divider} />

          <Text variant="bodyLarge" style={styles.sectionTitle}>
            Текущая локация
          </Text>

          <View style={styles.buttonGroup}>
            <Button
              mode={formData.current_location_type === 'warehouse' ? 'contained' : 'outlined'}
              onPress={() => handleLocationTypeChange('warehouse')}
              style={styles.locationButton}
            >
              Склад
            </Button>
            <Button
              mode={formData.current_location_type === 'employee' ? 'contained' : 'outlined'}
              onPress={() => handleLocationTypeChange('employee')}
              style={styles.locationButton}
            >
              Сотрудник
            </Button>
          </View>

          {formData.current_location_type === 'warehouse' ? (
            <ReferencePicker
              label="Склад"
              referenceType="warehouse"
              queryKey="warehouses"
              value={formData.current_location_id}
              onSelect={(id) => setFormData({ ...formData, current_location_id: id })}
              getLabel={(item) => item.name}
              getDescription={(item) => item.address || ''}
              createFields={[
                { label: 'Название склада', key: 'name', required: true, autoFocus: true },
                { label: 'Адрес', key: 'address', required: false },
              ]}
            />
          ) : (
            <ReferencePicker
              label="Сотрудник"
              referenceType="employee"
              queryKey="employees"
              value={formData.current_location_id}
              onSelect={(id) => setFormData({ ...formData, current_location_id: id })}
              getLabel={(item) => item.full_name}
              getDescription={(item) => `Тел: ${item.phone_extension}`}
              createFields={[
                { label: 'ФИО', key: 'full_name', required: true, autoFocus: true },
                { label: 'Телефонный номер (3 цифры)', key: 'phone_extension', required: true, type: 'numeric', maxLength: 3 },
              ]}
              validation={(data) => {
                if (data.phone_extension && data.phone_extension.length !== 3) {
                  return 'Телефонный номер должен состоять из 3 цифр'
                }
                return null
              }}
            />
          )}

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={createMutation.isPending}
            style={styles.submitButton}
            icon="check"
          >
            Создать устройство
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 16,
    elevation: 4,
  },
  title: {
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  locationButton: {
    flex: 1,
  },
  submitButton: {
    marginTop: 16,
  },
})

