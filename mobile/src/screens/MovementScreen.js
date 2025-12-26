import React, { useState, useMemo } from 'react'
import { View, ScrollView, StyleSheet, Alert } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Card, 
  Text, 
  Button, 
  ActivityIndicator, 
  Searchbar,
  List,
  IconButton,
  TextInput,
  Portal,
  Dialog,
} from 'react-native-paper'
import { movementService } from '../services/movements'
import { referenceService } from '../services/references'
import { deviceService } from '../services/devices'

export default function MovementScreen({ route, navigation }) {
  const { deviceId } = route.params
  const [locationType, setLocationType] = useState('warehouse')
  const [locationId, setLocationId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', phone_extension: '', address: '' })
  const queryClient = useQueryClient()

  // Получаем данные устройства для проверки текущей локации
  const { data: device } = useQuery({
    queryKey: ['device', deviceId],
    queryFn: () => deviceService.getById(deviceId),
  })

  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => referenceService.getEmployees(),
  })

  const { data: warehouses = [], isLoading: warehousesLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => referenceService.getWarehouses(),
  })

  // Фильтрация данных по поисковому запросу
  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees
    const query = searchQuery.toLowerCase()
    return employees.filter(emp => 
      emp.full_name.toLowerCase().includes(query) || 
      emp.phone_extension.includes(query)
    )
  }, [employees, searchQuery])

  const filteredWarehouses = useMemo(() => {
    if (!searchQuery.trim()) return warehouses
    const query = searchQuery.toLowerCase()
    return warehouses.filter(wh => 
      wh.name.toLowerCase().includes(query) ||
      (wh.address && wh.address.toLowerCase().includes(query))
    )
  }, [warehouses, searchQuery])

  // Мутации для создания
  const createEmployeeMutation = useMutation({
    mutationFn: (data) => referenceService.createEmployee(data),
    onSuccess: (newEmployee) => {
      queryClient.invalidateQueries(['employees'])
      setShowCreateModal(false)
      setCreateForm({ name: '', phone_extension: '', address: '' })
      setLocationId(newEmployee.id)
      Alert.alert('Успех', `Сотрудник "${newEmployee.full_name}" успешно добавлен`)
    },
    onError: (error) => {
      Alert.alert('Ошибка', error.response?.data?.detail || 'Не удалось создать сотрудника')
    },
  })

  const createWarehouseMutation = useMutation({
    mutationFn: (data) => referenceService.createWarehouse(data),
    onSuccess: (newWarehouse) => {
      queryClient.invalidateQueries(['warehouses'])
      setShowCreateModal(false)
      setCreateForm({ name: '', phone_extension: '', address: '' })
      setLocationId(newWarehouse.id)
      Alert.alert('Успех', `Склад "${newWarehouse.name}" успешно добавлен`)
    },
    onError: (error) => {
      Alert.alert('Ошибка', error.response?.data?.detail || 'Не удалось создать склад')
    },
  })

  const createMutation = useMutation({
    mutationFn: (data) => {
      console.log('createMutation.mutate вызван с данными:', data)
      return movementService.create(data)
    },
    onSuccess: (data) => {
      console.log('Перемещение успешно создано:', data)
      // Инвалидируем все связанные запросы для обновления данных
      queryClient.invalidateQueries({ queryKey: ['movements'] })
      queryClient.invalidateQueries({ queryKey: ['devices'] })
      queryClient.invalidateQueries({ queryKey: ['device', deviceId] })
      
      // Показываем сообщение об успехе и закрываем экран
      Alert.alert(
        'Успех', 
        'Устройство успешно перемещено',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack()
            }
          }
        ],
        { cancelable: false }
      )
    },
    onError: (error) => {
      console.error('Ошибка при создании перемещения:', error)
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || error.message || 'Не удалось создать перемещение'
      Alert.alert(
        'Ошибка', 
        errorMessage,
        [{ text: 'OK' }]
      )
    },
  })

  const handleSubmit = () => {
    console.log('handleSubmit вызван', { deviceId, locationType, locationId })
    
    if (!locationId) {
      Alert.alert('Ошибка', 'Выберите локацию')
      return
    }

    // Проверка: нельзя переместить устройство в ту же локацию
    if (device && 
        device.current_location_type === locationType && 
        device.current_location_id === locationId) {
      Alert.alert(
        'Ошибка', 
        'Устройство уже находится в выбранной локации. Перемещение в ту же локацию невозможно.'
      )
      return
    }

    console.log('Отправка данных перемещения:', {
      device_id: deviceId,
      to_location_type: locationType,
      to_location_id: locationId,
    })

    createMutation.mutate({
      device_id: deviceId,
      to_location_type: locationType,
      to_location_id: locationId,
    })
  }

  const handleOpenCreateModal = () => {
    setCreateForm({ name: '', phone_extension: '', address: '' })
    setShowCreateModal(true)
  }

  const handleCreate = () => {
    if (locationType === 'employee') {
      if (!createForm.name.trim() || !createForm.phone_extension.trim()) {
        Alert.alert('Ошибка', 'Заполните все обязательные поля')
        return
      }
      if (createForm.phone_extension.length !== 3) {
        Alert.alert('Ошибка', 'Телефонный номер должен состоять из 3 цифр')
        return
      }
      createEmployeeMutation.mutate({
        full_name: createForm.name.trim(),
        phone_extension: createForm.phone_extension.trim(),
      })
    } else {
      if (!createForm.name.trim()) {
        Alert.alert('Ошибка', 'Введите название склада')
        return
      }
      createWarehouseMutation.mutate({
        name: createForm.name.trim(),
        address: createForm.address.trim() || null,
      })
    }
  }

  const selectedItem = locationType === 'employee'
    ? employees.find(e => e.id === locationId)
    : warehouses.find(w => w.id === locationId)

  const items = locationType === 'employee' ? filteredEmployees : filteredWarehouses
  const isLoading = locationType === 'employee' ? employeesLoading : warehousesLoading

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.title}>
              Переместить устройство
            </Text>

            <Text variant="bodyMedium" style={styles.label}>
              Тип локации назначения:
            </Text>
            <View style={styles.buttonGroup}>
              <Button
                mode={locationType === 'warehouse' ? 'contained' : 'outlined'}
                onPress={() => {
                  setLocationType('warehouse')
                  setLocationId(null)
                  setSearchQuery('')
                }}
                style={styles.button}
              >
                Склад
              </Button>
              <Button
                mode={locationType === 'employee' ? 'contained' : 'outlined'}
                onPress={() => {
                  setLocationType('employee')
                  setLocationId(null)
                  setSearchQuery('')
                }}
                style={styles.button}
              >
                Сотрудник
              </Button>
            </View>

            <Text variant="bodyMedium" style={styles.label}>
              {locationType === 'employee' ? 'Выберите сотрудника:' : 'Выберите склад:'}
            </Text>

            {/* Поиск */}
            <Searchbar
              placeholder={`Поиск ${locationType === 'employee' ? 'сотрудника' : 'склада'}...`}
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={styles.searchbar}
              icon="magnify"
            />

            {/* Кнопка добавления */}
            <Button
              mode="outlined"
              icon="plus"
              onPress={handleOpenCreateModal}
              style={styles.addButton}
            >
              {locationType === 'employee' ? 'Добавить нового сотрудника' : 'Добавить новый склад'}
            </Button>

            {/* Выбранный элемент */}
            {selectedItem && (
              <Card style={styles.selectedCard}>
                <Card.Content>
                  <View style={styles.selectedItem}>
                    <Text variant="bodyMedium" style={styles.selectedText}>
                      {locationType === 'employee'
                        ? `${selectedItem.full_name} (${selectedItem.phone_extension})`
                        : selectedItem.name}
                    </Text>
                    <IconButton
                      icon="close"
                      size={20}
                      onPress={() => setLocationId(null)}
                    />
                  </View>
                </Card.Content>
              </Card>
            )}

            {/* Список элементов */}
            {isLoading ? (
              <ActivityIndicator style={styles.loader} />
            ) : items.length === 0 ? (
              <Text style={styles.emptyText}>
                {searchQuery ? 'Ничего не найдено' : 'Список пуст'}
              </Text>
            ) : (
              <View style={styles.listContainer}>
                {items.map(item => (
                  <List.Item
                    key={item.id}
                    title={locationType === 'employee' 
                      ? item.full_name 
                      : item.name}
                    description={locationType === 'employee'
                      ? `Тел: ${item.phone_extension}`
                      : item.address || 'Без адреса'}
                    left={props => (
                      <List.Icon 
                        {...props} 
                        icon={locationType === 'employee' ? 'account' : 'warehouse'}
                      />
                    )}
                    right={props => locationId === item.id && (
                      <List.Icon {...props} icon="check" color="#6200ee" />
                    )}
                    onPress={() => setLocationId(item.id)}
                    style={[
                      styles.listItem,
                      locationId === item.id && styles.listItemSelected
                    ]}
                  />
                ))}
              </View>
            )}

            <Button
              mode="contained"
              onPress={() => {
                console.log('Кнопка "Переместить" нажата')
                handleSubmit()
              }}
              loading={createMutation.isPending}
              style={styles.submitButton}
              disabled={!locationId || createMutation.isPending}
            >
              Переместить
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Модальное окно создания */}
      <Portal>
        <Dialog 
          visible={showCreateModal} 
          onDismiss={() => setShowCreateModal(false)}
          style={styles.dialog}
        >
          <Dialog.Title>
            {locationType === 'employee' ? 'Новый сотрудник' : 'Новый склад'}
          </Dialog.Title>
          <Dialog.Content>
            <TextInput
              label={locationType === 'employee' ? 'ФИО *' : 'Название *'}
              value={createForm.name}
              onChangeText={(text) => setCreateForm({ ...createForm, name: text })}
              style={styles.input}
              mode="outlined"
              autoFocus={true}
              returnKeyType={locationType === 'employee' ? 'next' : 'done'}
            />
            {locationType === 'employee' ? (
              <TextInput
                label="Телефонный номер (3 цифры) *"
                value={createForm.phone_extension}
                onChangeText={(text) => setCreateForm({ ...createForm, phone_extension: text.replace(/\D/g, '').slice(0, 3) })}
                keyboardType="numeric"
                maxLength={3}
                style={styles.input}
                mode="outlined"
                returnKeyType="done"
              />
            ) : (
              <TextInput
                label="Адрес"
                value={createForm.address}
                onChangeText={(text) => setCreateForm({ ...createForm, address: text })}
                style={styles.input}
                mode="outlined"
                multiline
                numberOfLines={2}
                returnKeyType="done"
              />
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowCreateModal(false)}>Отмена</Button>
            <Button 
              onPress={handleCreate}
              loading={createEmployeeMutation.isPending || createWarehouseMutation.isPending}
            >
              Создать
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  card: {
    margin: 16,
    elevation: 4,
  },
  title: {
    marginBottom: 24,
  },
  label: {
    marginTop: 16,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  button: {
    flex: 1,
  },
  searchbar: {
    marginTop: 8,
    marginBottom: 8,
  },
  addButton: {
    marginBottom: 16,
  },
  selectedCard: {
    marginBottom: 16,
    backgroundColor: '#e3f2fd',
  },
  selectedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedText: {
    flex: 1,
    fontWeight: 'bold',
  },
  listContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
  },
  listItem: {
    paddingHorizontal: 8,
  },
  listItemSelected: {
    backgroundColor: '#f3e5f5',
  },
  loader: {
    marginVertical: 32,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 32,
  },
  submitButton: {
    marginTop: 8,
  },
  dialog: {
    backgroundColor: '#fff',
  },
  input: {
    marginBottom: 8,
  },
})
