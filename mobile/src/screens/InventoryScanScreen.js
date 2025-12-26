import React, { useState, useMemo } from 'react'
import { View, StyleSheet, Alert, ScrollView, TouchableOpacity } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { Text, Button, ActivityIndicator, TextInput, Card, List, Portal, Dialog } from 'react-native-paper'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryService } from '../services/inventory'
import { deviceService } from '../services/devices'

export default function InventoryScanScreen({ route, navigation }) {
  const { sessionId } = route.params
  const [permission, requestPermission] = useCameraPermissions()
  const [scanned, setScanned] = useState(false)
  const [inventoryNumber, setInventoryNumber] = useState('')
  const [showCamera, setShowCamera] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showDeviceSelectionDialog, setShowDeviceSelectionDialog] = useState(false)
  const [matchedDevices, setMatchedDevices] = useState([])
  const queryClient = useQueryClient()

  // Получаем устройства сессии (все, включая проверенные)
  const { data: sessionDevices = [], isLoading: devicesLoading } = useQuery({
    queryKey: ['inventorySessionDevices', sessionId],
    queryFn: () => inventoryService.getSessionDevices(sessionId),
  })

  // Фильтрация устройств по введенному номеру для автозаполнения
  const filteredDevices = useMemo(() => {
    if (!inventoryNumber.trim()) {
      return []
    }
    const query = inventoryNumber.trim().toLowerCase()
    return sessionDevices.filter((record) => {
      const invNum = record.device.inventory_number.toLowerCase()
      return invNum.includes(query)
    }).slice(0, 10) // Ограничиваем до 10 результатов
  }, [sessionDevices, inventoryNumber])

  // Мутация отметки устройства
  const checkDeviceMutation = useMutation({
    mutationFn: ({ deviceId, checked }) =>
      inventoryService.checkDevice(sessionId, deviceId, checked),
    onSuccess: (data) => {
      Alert.alert('Успех', 'Устройство проверено!')
      queryClient.invalidateQueries(['inventorySessionDevices', sessionId])
      queryClient.invalidateQueries(['inventoryStatistics', sessionId])
      setScanned(false)
      setShowCamera(false)
    },
    onError: (error) => {
      Alert.alert('Ошибка', error.response?.data?.detail || 'Не удалось отметить устройство')
      setScanned(false)
    },
  })

  // Мутация снятия отметки
  const uncheckDeviceMutation = useMutation({
    mutationFn: ({ recordId }) => inventoryService.uncheckRecord(recordId),
    onSuccess: () => {
      Alert.alert('Успех', 'Отметка проверки снята')
      queryClient.invalidateQueries(['inventorySessionDevices', sessionId])
      queryClient.invalidateQueries(['inventorySessionStatistics', sessionId])
      setInventoryNumber('')
    },
    onError: (error) => {
      Alert.alert('Ошибка', error.response?.data?.detail || 'Не удалось снять отметку')
    },
  })

  const handleDeviceSelect = (record) => {
    if (record.checked) {
      // Устройство уже проверено - предлагаем отменить проверку
      Alert.alert(
        'Устройство уже проверено',
        `Устройство ${record.device.inventory_number} уже было проверено ранее. Хотите снять отметку проверки?`,
        [
          {
            text: 'Отмена',
            style: 'cancel',
          },
          {
            text: 'Снять отметку',
            style: 'destructive',
            onPress: () => {
              uncheckDeviceMutation.mutate({ recordId: record.id })
              setShowDeviceSelectionDialog(false)
            },
          },
        ]
      )
    } else {
      // Отмечаем устройство как проверенное
      checkDeviceMutation.mutate({
        deviceId: record.device.id,
        checked: true,
      })
      setShowDeviceSelectionDialog(false)
      setInventoryNumber('')
      setShowSuggestions(false)
    }
  }

  const handleCheckDevice = async (inventoryNum) => {
    const trimmedNumber = inventoryNum.trim()
    if (!trimmedNumber) {
      Alert.alert('Ошибка', 'Введите инвентарный номер')
      return
    }

    try {
      // Ищем устройство в сессии по инвентарному номеру (точное совпадение)
      const exactMatch = sessionDevices.find(
        (r) => r.device.inventory_number === trimmedNumber
      )

      if (exactMatch) {
        // Точное совпадение найдено
        handleDeviceSelect(exactMatch)
        return
      }

      // Если точного совпадения нет, ищем частичные совпадения
      const partialMatches = sessionDevices.filter((r) =>
        r.device.inventory_number.toLowerCase().includes(trimmedNumber.toLowerCase())
      )
      
      if (partialMatches.length === 0) {
        Alert.alert(
          'Не найдено',
          `Устройство с номером ${trimmedNumber} не найдено в этой сессии инвентаризации`
        )
        return
      }

      if (partialMatches.length === 1) {
        // Если только один вариант, используем его
        handleDeviceSelect(partialMatches[0])
        return
      }

      // Несколько вариантов - показываем диалог для выбора
      setMatchedDevices(partialMatches)
      setShowDeviceSelectionDialog(true)
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось обработать запрос')
    }
  }

  const handleBarCodeScanned = async (result) => {
    if (scanned) return

    setScanned(true)
    const data = result.data.trim()
    await handleCheckDevice(data)
    setTimeout(() => setScanned(false), 2000)
  }

  if (!permission) {
    return <View style={styles.container} />
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Нет доступа к камере</Text>
        <Button mode="contained" onPress={requestPermission} style={styles.button}>
          Запросить разрешение
        </Button>
      </View>
    )
  }

  if (devicesLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <Text style={styles.message}>Загрузка устройств...</Text>
      </View>
    )
  }

  if (showCamera) {
    if (!permission) {
      return <View style={styles.container} />
    }

    if (!permission.granted) {
      return (
        <View style={styles.container}>
          <Text style={styles.message}>Нет доступа к камере</Text>
          <Button mode="contained" onPress={requestPermission} style={styles.button}>
            Запросить разрешение
          </Button>
          <Button mode="outlined" onPress={() => setShowCamera(false)} style={styles.button}>
            Назад
          </Button>
        </View>
      )
    }

    return (
      <View style={styles.container}>
        <CameraView
          style={styles.camera}
          barcodeScannerSettings={{
            barcodeTypes: ['qr', 'ean13', 'ean8', 'code128'],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        >
          <View style={styles.overlay}>
            <View style={styles.topOverlay}>
              <Text style={styles.instruction}>
                Сканируйте QR код устройства
              </Text>
            </View>
            <View style={styles.middleOverlay}>
              <View style={styles.scanArea} />
            </View>
            <View style={styles.bottomOverlay}>
              <Button
                mode="contained"
                onPress={() => setShowCamera(false)}
                style={styles.button}
              >
                Закрыть камеру
              </Button>
            </View>
          </View>
        </CameraView>
        {checkDeviceMutation.isPending && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}
      </View>
    )
  }

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.title}>
            Проверка устройства
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Введите инвентарный номер или отсканируйте QR-код
          </Text>
          
          <View style={styles.inputContainer}>
            <TextInput
              label="Инвентарный номер"
              value={inventoryNumber}
              onChangeText={(text) => {
                setInventoryNumber(text)
                setShowSuggestions(text.trim().length > 0)
              }}
              onFocus={() => {
                if (inventoryNumber.trim().length > 0) {
                  setShowSuggestions(true)
                }
              }}
              onBlur={() => {
                // Небольшая задержка чтобы успел сработать onPress на элементе списка
                setTimeout(() => setShowSuggestions(false), 200)
              }}
              mode="outlined"
              style={styles.input}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={() => handleCheckDevice(inventoryNumber)}
            />
            {showSuggestions && filteredDevices.length > 0 && (
              <Card style={styles.suggestionsCard}>
                <View>
                  {filteredDevices.map((item) => {
                    const device = item.device
                    return (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => {
                          setInventoryNumber(device.inventory_number)
                          setShowSuggestions(false)
                        }}
                      >
                        <List.Item
                          title={device.inventory_number}
                          description={`Сер: ${device.serial_number}${item.checked ? ' (Проверено)' : ''}`}
                          titleStyle={styles.suggestionTitle}
                          descriptionStyle={styles.suggestionDescription}
                          right={() => item.checked && (
                            <Text style={styles.checkedBadge}>✓</Text>
                          )}
                        />
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </Card>
            )}
          </View>
          
          <View style={styles.buttonRow}>
            <Button
              mode="contained"
              onPress={() => handleCheckDevice(inventoryNumber)}
              loading={checkDeviceMutation.isPending}
              disabled={!inventoryNumber.trim()}
              icon="check"
              style={styles.actionButton}
            >
              Проверить
            </Button>
            
            <Button
              mode="outlined"
              onPress={() => setShowCamera(true)}
              icon="qrcode-scan"
              style={styles.actionButton}
            >
              Сканировать QR
            </Button>
          </View>
        </Card.Content>
      </Card>

      {/* Диалог выбора устройства из нескольких найденных */}
      <Portal>
        <Dialog
          visible={showDeviceSelectionDialog}
          onDismiss={() => setShowDeviceSelectionDialog(false)}
          style={styles.dialog}
        >
          <Dialog.Title>Выберите устройство</Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            <Text variant="bodyMedium" style={styles.dialogHint}>
              Найдено {matchedDevices.length} устройств. Выберите нужное:
            </Text>
            <View style={styles.devicesList}>
              {matchedDevices.map((record) => {
                const device = record.device
                return (
                  <TouchableOpacity
                    key={record.id}
                    onPress={() => handleDeviceSelect(record)}
                  >
                    <Card style={[styles.deviceCard, record.checked && styles.checkedDeviceCard]}>
                      <Card.Content>
                        <View style={styles.deviceCardContent}>
                          <View style={styles.deviceInfo}>
                            <Text variant="titleMedium">{device.inventory_number}</Text>
                            <Text variant="bodySmall">Сер: {device.serial_number}</Text>
                            {record.checked && (
                              <Text variant="bodySmall" style={styles.checkedLabel}>
                                ✓ Проверено
                              </Text>
                            )}
                          </View>
                        </View>
                      </Card.Content>
                    </Card>
                  </TouchableOpacity>
                )
              })}
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDeviceSelectionDialog(false)}>Отмена</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    elevation: 2,
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    marginBottom: 24,
    textAlign: 'center',
    color: '#666',
  },
  inputContainer: {
    marginBottom: 16,
    position: 'relative',
    zIndex: 1000,
  },
  input: {
    marginBottom: 0,
  },
  suggestionsCard: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    maxHeight: 200,
    zIndex: 1001,
    elevation: 5,
  },
  suggestionTitle: {
    fontSize: 14,
  },
  suggestionDescription: {
    fontSize: 12,
    color: '#666',
  },
  checkedBadge: {
    color: '#4caf50',
    fontSize: 18,
    marginRight: 8,
  },
  dialog: {
    maxHeight: '80%',
  },
  dialogHint: {
    marginBottom: 16,
    color: '#666',
  },
  devicesList: {
    maxHeight: 400,
  },
  deviceCard: {
    marginBottom: 8,
    elevation: 1,
  },
  checkedDeviceCard: {
    backgroundColor: '#e8f5e9',
  },
  deviceCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deviceInfo: {
    flex: 1,
  },
  checkedLabel: {
    color: '#4caf50',
    marginTop: 4,
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  topOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  middleOverlay: {
    flex: 2,
    flexDirection: 'row',
  },
  scanArea: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#4caf50',
    borderRadius: 10,
    margin: 50,
    backgroundColor: 'transparent',
  },
  bottomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  instruction: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  button: {
    marginTop: 20,
  },
  message: {
    marginBottom: 20,
    fontSize: 16,
    textAlign: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    maxHeight: '80%',
  },
  dialogHint: {
    marginBottom: 16,
    color: '#666',
  },
  devicesList: {
    maxHeight: 400,
  },
  deviceCard: {
    marginBottom: 8,
    elevation: 1,
  },
  checkedDeviceCard: {
    backgroundColor: '#e8f5e9',
  },
  deviceCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deviceInfo: {
    flex: 1,
  },
  checkedLabel: {
    color: '#4caf50',
    marginTop: 4,
    fontWeight: 'bold',
  },
})

