import React, { useState, useEffect } from 'react'
import { View, ScrollView, StyleSheet, Alert, Pressable } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card,
  Text,
  Button,
  ActivityIndicator,
  Checkbox,
  ProgressBar,
  Chip,
  Portal,
  Dialog,
  TextInput,
} from 'react-native-paper'
import { inventoryService } from '../services/inventory'
import { referenceService } from '../services/references'

export default function InventoryScreen({ navigation }) {
  const [selectedDeviceTypes, setSelectedDeviceTypes] = useState([])
  const [sessionName, setSessionName] = useState('')
  const [showSessionDialog, setShowSessionDialog] = useState(false)
  const [activeSessionId, setActiveSessionId] = useState(null)
  const queryClient = useQueryClient()

  // Проверяем авторизацию при монтировании компонента
  useEffect(() => {
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem('token')
      if (!token && navigation) {
        navigation.navigate('Login')
      }
    }
    checkAuth()
  }, [navigation])

  // Получаем типы устройств
  const { data: deviceTypes = [], isLoading: deviceTypesLoading, error: deviceTypesError } = useQuery({
    queryKey: ['deviceTypes'],
    queryFn: () => referenceService.getDeviceTypes(),
    onSuccess: (data) => {
      console.log('Device types loaded:', data)
    },
    onError: (error) => {
      console.error('Error loading device types:', error)
    },
  })

  // Получаем активные сессии
  const { data: activeSessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['inventorySessions', 'active'],
    queryFn: () => inventoryService.getSessions('active'),
  })

  // Получаем устройства активной сессии
  const { data: sessionDevices = [], isLoading: devicesLoading } = useQuery({
    queryKey: ['inventorySessionDevices', activeSessionId],
    queryFn: () => inventoryService.getSessionDevices(activeSessionId),
    enabled: !!activeSessionId,
  })

  // Получаем статистику активной сессии
  const { data: statistics } = useQuery({
    queryKey: ['inventoryStatistics', activeSessionId],
    queryFn: () => inventoryService.getSessionStatistics(activeSessionId),
    enabled: !!activeSessionId,
  })

  // Мутация создания сессии
  const createSessionMutation = useMutation({
    mutationFn: (data) => inventoryService.createSession(data),
    onSuccess: (session) => {
      queryClient.invalidateQueries(['inventorySessions'])
      setActiveSessionId(session.id)
      setShowSessionDialog(false)
      setSelectedDeviceTypes([])
      setSessionName('')
      Alert.alert('Успех', 'Сессия инвентаризации создана')
    },
    onError: (error) => {
      Alert.alert('Ошибка', error.response?.data?.detail || 'Не удалось создать сессию')
    },
  })

  // Мутация отметки устройства
  const checkDeviceMutation = useMutation({
    mutationFn: ({ sessionId, deviceId, checked }) =>
      inventoryService.checkDevice(sessionId, deviceId, checked),
    onSuccess: () => {
      queryClient.invalidateQueries(['inventorySessionDevices', activeSessionId])
      queryClient.invalidateQueries(['inventoryStatistics', activeSessionId])
    },
  })

  const handleDeviceTypeToggle = (deviceTypeId) => {
    console.log('Toggle device type:', deviceTypeId, 'Current:', selectedDeviceTypes)
    setSelectedDeviceTypes((prev) => {
      const newSelection = prev.includes(deviceTypeId)
        ? prev.filter((id) => id !== deviceTypeId)
        : [...prev, deviceTypeId]
      console.log('New selection:', newSelection)
      return newSelection
    })
  }

  const handleCreateSession = () => {
    if (!sessionName.trim()) {
      Alert.alert('Ошибка', 'Введите название сессии')
      return
    }
    if (selectedDeviceTypes.length === 0) {
      Alert.alert('Ошибка', 'Выберите хотя бы один тип устройства')
      return
    }

    createSessionMutation.mutate({
      name: sessionName.trim(),
      device_type_ids: selectedDeviceTypes,
    })
  }

  const handleToggleDevice = (recordId, deviceId, checked) => {
    if (checked) {
      // Устройство уже проверено - предлагаем снять отметку
      Alert.alert(
        'Снять отметку проверки?',
        'Хотите снять отметку проверки с этого устройства?',
        [
          {
            text: 'Отмена',
            style: 'cancel',
          },
          {
            text: 'Снять отметку',
            style: 'destructive',
            onPress: () => {
              uncheckDeviceMutation.mutate({ recordId })
            },
          },
        ]
      )
    } else {
      // Устройство не проверено - отмечаем как проверенное
      Alert.alert(
        'Подтверждение',
        'Отметить устройство как проверенное?',
        [
          {
            text: 'Отмена',
            style: 'cancel',
          },
          {
            text: 'Отметить',
            onPress: () => {
              checkDeviceMutation.mutate({
                sessionId: activeSessionId,
                deviceId,
                checked: true,
              })
            },
          },
        ]
      )
    }
  }

  const handleStartScan = () => {
    navigation.navigate('InventoryScan', { sessionId: activeSessionId })
  }

  if (deviceTypesLoading || sessionsLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  // Если нет активной сессии, показываем форму создания
  if (!activeSessionId) {
    return (
      <ScrollView style={styles.container}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.title}>
              Инвентаризация
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Создайте новую сессию инвентаризации, выбрав типы устройств для проверки
            </Text>

            <Button
              mode="contained"
              onPress={() => setShowSessionDialog(true)}
              style={styles.button}
              icon="plus"
            >
              Создать сессию
            </Button>

            {activeSessions.length > 0 && (
              <View style={styles.activeSessions}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Активные сессии:
                </Text>
                {activeSessions.map((session) => (
                  <Card
                    key={session.id}
                    style={styles.sessionCard}
                    onPress={() => setActiveSessionId(session.id)}
                  >
                    <Card.Content>
                      <Text variant="titleMedium">{session.name}</Text>
                      <Text variant="bodySmall" style={styles.sessionDate}>
                        Создана: {new Date(session.created_at).toLocaleString('ru-RU')}
                      </Text>
                      <Text variant="bodySmall">
                        Типы устройств: {session.device_types.map((dt) => dt.name).join(', ')}
                      </Text>
                    </Card.Content>
                  </Card>
                ))}
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Диалог создания сессии */}
        <Portal>
          <Dialog
            visible={showSessionDialog}
            onDismiss={() => {
              setShowSessionDialog(false)
              setSelectedDeviceTypes([])
              setSessionName('')
            }}
          >
            <Dialog.Title>Создать сессию инвентаризации</Dialog.Title>
            <Dialog.Content>
              <ScrollView>
                <TextInput
                  label="Название сессии *"
                  value={sessionName}
                  onChangeText={setSessionName}
                  mode="outlined"
                  style={styles.input}
                  autoFocus
                />
                <Text variant="bodyMedium" style={styles.label}>
                  Выберите типы устройств:
                </Text>
                {deviceTypesLoading ? (
                  <ActivityIndicator style={styles.loader} />
                ) : deviceTypesError ? (
                  <View style={styles.emptyContainer}>
                    <Text variant="bodySmall" style={styles.errorText}>
                      Ошибка загрузки типов устройств
                    </Text>
                    <Text variant="bodySmall" style={styles.errorHint}>
                      {deviceTypesError.response?.status === 401 
                        ? 'Требуется авторизация. Перенаправляем на экран входа...'
                        : deviceTypesError.message || 'Не удалось загрузить данные'}
                    </Text>
                    {deviceTypesError.response?.status === 401 && (
                      <Button
                        mode="contained"
                        onPress={async () => {
                          await AsyncStorage.removeItem('token')
                          if (navigation) {
                            navigation.navigate('Login')
                          }
                        }}
                        style={styles.loginButton}
                      >
                        Войти
                      </Button>
                    )}
                  </View>
                ) : deviceTypes.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text variant="bodySmall" style={styles.emptyText}>
                      Типы устройств не найдены
                    </Text>
                    <Text variant="bodySmall" style={styles.emptyHint}>
                      Проверьте авторизацию или создайте типы устройств в справочниках
                    </Text>
                  </View>
                ) : (
                  <View style={styles.deviceTypesList}>
                    {deviceTypes.map((deviceType) => {
                      const isSelected = selectedDeviceTypes.includes(deviceType.id)
                      return (
                        <Pressable
                          key={deviceType.id}
                          onPress={() => {
                            console.log('Pressable pressed for device type:', deviceType.id, deviceType.name)
                            handleDeviceTypeToggle(deviceType.id)
                          }}
                          style={({ pressed }) => [
                            styles.deviceTypeItem,
                            pressed && styles.deviceTypeItemPressed,
                            isSelected && styles.deviceTypeItemSelected,
                          ]}
                        >
                          <Checkbox
                            status={isSelected ? 'checked' : 'unchecked'}
                            onPress={(e) => {
                              e?.stopPropagation?.()
                              console.log('Checkbox pressed for:', deviceType.id)
                              handleDeviceTypeToggle(deviceType.id)
                            }}
                            uncheckedColor="#666"
                            color="#6200ee"
                          />
                          <Text
                            variant="bodyMedium"
                            style={[
                              styles.deviceTypeText,
                              isSelected && styles.deviceTypeTextSelected,
                            ]}
                          >
                            {deviceType.name} ({deviceType.code})
                          </Text>
                        </Pressable>
                      )
                    })}
                  </View>
                )}
                {selectedDeviceTypes.length > 0 && (
                  <Text variant="bodySmall" style={styles.selectedCount}>
                    Выбрано: {selectedDeviceTypes.length}
                  </Text>
                )}
              </ScrollView>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setShowSessionDialog(false)}>Отмена</Button>
              <Button
                onPress={handleCreateSession}
                loading={createSessionMutation.isPending}
              >
                Создать
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </ScrollView>
    )
  }

  // Показываем активную сессию
  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          {statistics && (
            <View style={styles.statistics}>
              <Text variant="titleLarge" style={styles.statsTitle}>
                Прогресс инвентаризации
              </Text>
              <ProgressBar
                progress={statistics.progress_percent / 100}
                color="#4caf50"
                style={styles.progressBar}
              />
              <View style={styles.statsRow}>
                <Chip icon="check-circle" style={styles.chip}>
                  Проверено: {statistics.checked_devices}
                </Chip>
                <Chip icon="clock-outline" style={styles.chip}>
                  Осталось: {statistics.remaining_devices}
                </Chip>
              </View>
              <Text variant="bodySmall" style={styles.statsTotal}>
                Всего устройств: {statistics.total_devices}
              </Text>
            </View>
          )}

          <View style={styles.actions}>
            <Button
              mode="contained"
              onPress={handleStartScan}
              icon="qrcode-scan"
              style={styles.actionButton}
            >
              Сканировать QR
            </Button>
            <Button
              mode="outlined"
              onPress={() => navigation.navigate('InventoryDevices', { sessionId: activeSessionId })}
              icon="format-list-bulleted"
              style={styles.actionButton}
            >
              Список устройств
            </Button>
          </View>

          {devicesLoading ? (
            <ActivityIndicator style={styles.loader} />
          ) : (
            <View style={styles.devicesList}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Непроверенные устройства ({sessionDevices.filter((d) => !d.checked).length}):
              </Text>
              {sessionDevices
                .filter((record) => !record.checked)
                .slice(0, 10)
                .map((record) => (
                  <Card
                    key={record.id}
                    style={styles.deviceCard}
                  >
                    <Card.Content>
                      <View style={styles.deviceRow}>
                        <View style={styles.deviceInfo}>
                          <Text variant="bodyMedium">{record.device.inventory_number}</Text>
                          <Text variant="bodySmall">Сер: {record.device.serial_number}</Text>
                        </View>
                        <Checkbox
                          status={record.checked ? 'checked' : 'unchecked'}
                          onPress={() => handleToggleDevice(record.id, record.device.id, record.checked)}
                        />
                      </View>
                    </Card.Content>
                  </Card>
                ))}
              {sessionDevices.filter((d) => !d.checked).length > 10 && (
                <Button
                  mode="text"
                  onPress={() => navigation.navigate('InventoryDevices', { sessionId: activeSessionId })}
                  style={styles.moreButton}
                >
                  Показать все ({sessionDevices.filter((d) => !d.checked).length})
                </Button>
              )}
            </View>
          )}
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    margin: 16,
    elevation: 4,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 24,
    color: '#666',
  },
  button: {
    marginTop: 16,
  },
  input: {
    marginBottom: 16,
  },
  label: {
    marginTop: 8,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  deviceTypesList: {
    marginTop: 8,
    marginBottom: 8,
  },
  deviceTypeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    minHeight: 48,
  },
  deviceTypeItemPressed: {
    backgroundColor: '#e0e0e0',
  },
  deviceTypeItemSelected: {
    backgroundColor: '#e3f2fd',
    borderWidth: 1,
    borderColor: '#6200ee',
  },
  deviceTypeText: {
    flex: 1,
    marginLeft: 8,
  },
  deviceTypeTextSelected: {
    fontWeight: 'bold',
    color: '#6200ee',
  },
  statistics: {
    marginBottom: 24,
  },
  statsTitle: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  chip: {
    margin: 4,
  },
  statsTotal: {
    textAlign: 'center',
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
  },
  loader: {
    marginVertical: 32,
  },
  devicesList: {
    marginTop: 16,
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  deviceCard: {
    marginBottom: 8,
  },
  deviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deviceInfo: {
    flex: 1,
  },
  activeSessions: {
    marginTop: 24,
  },
  sessionCard: {
    marginTop: 8,
    marginBottom: 8,
  },
  sessionDate: {
    color: '#666',
    marginTop: 4,
  },
  moreButton: {
    marginTop: 8,
  },
  emptyContainer: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyHint: {
    color: '#999',
    textAlign: 'center',
    fontSize: 12,
  },
  errorText: {
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorHint: {
    color: '#999',
    textAlign: 'center',
    fontSize: 12,
    marginBottom: 16,
  },
  loginButton: {
    marginTop: 8,
  },
  selectedCount: {
    marginTop: 8,
    color: '#6200ee',
    fontWeight: 'bold',
  },
})

