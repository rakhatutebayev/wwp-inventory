import React, { useState } from 'react'
import { View, ScrollView, StyleSheet, FlatList, Alert } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Card, Text, Button, ActivityIndicator, Divider, Portal, Dialog, List } from 'react-native-paper'
import { deviceService } from '../services/devices'
import { movementService } from '../services/movements'
import { referenceService } from '../services/references'
import { printLabel, LABEL_FORMATS } from '../services/printService'
import { useLocale } from '../contexts/LocaleContext'

export default function DeviceDetailScreen({ route, navigation }) {
  const { t, locale } = useLocale()
  const { deviceId } = route.params
  const [showFormatDialog, setShowFormatDialog] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState('38x21')
  const [showMovementHistory, setShowMovementHistory] = useState(false)

  const { data: device, isLoading } = useQuery({
    queryKey: ['device', deviceId],
    queryFn: () => deviceService.getById(deviceId),
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

  // История перемещений загружается только при нажатии кнопки
  const { data: movements = [], isLoading: movementsLoading, refetch: refetchMovements } = useQuery({
    queryKey: ['movements', deviceId],
    queryFn: () => movementService.getByDevice(deviceId),
    enabled: false, // Не загружать автоматически
  })

  const handleLoadMovementHistory = async () => {
    setShowMovementHistory(true)
    await refetchMovements()
  }

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => referenceService.getEmployees(),
  })

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => referenceService.getWarehouses(),
  })

  if (isLoading || !device) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    )
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

  const handlePrint = async () => {
    try {
      // Открываем системный диалог выбора принтера
      // Это покажет список всех доступных принтеров, включая:
      // - Phomemo M110 (если подключен через Bluetooth)
      // - SUPVAN T50M Pro (если подключен через Bluetooth)
      await printLabel(device.id, selectedFormat)
      Alert.alert('Успех', 'Печать отправлена на принтер')
      setShowFormatDialog(false)
    } catch (error) {
      Alert.alert('Ошибка', error.message)
    }
  }

  const handlePrintClick = () => {
    setShowFormatDialog(true)
  }

  const handleFormatSelect = (format) => {
    setSelectedFormat(format)
    setShowFormatDialog(false)
    // Автоматически запускаем печать после выбора формата
    setTimeout(() => {
      printLabel(device.id, format)
        .then(() => Alert.alert('Успех', 'Печать отправлена на принтер'))
        .catch((error) => Alert.alert('Ошибка', error.message))
    }, 100)
  }

  const renderMovement = ({ item }) => {
      const fromLocation = item.from_location_type
      ? getLocationName(item.from_location_type, item.from_location_id)
      : t('common.newDevice')
    
    const toLocation = getLocationName(item.to_location_type, item.to_location_id)
    const date = new Date(item.moved_at).toLocaleString(locale === 'en' ? 'en-US' : 'ru-RU')

    return (
      <Card style={styles.movementCard}>
        <Card.Content>
          <Text variant="bodyMedium" style={styles.movementDate}>{date}</Text>
          <Text variant="bodySmall">{t('movements.from')}: {fromLocation}</Text>
          <Text variant="bodySmall" style={styles.movementTo}>{t('movements.to')}: {toLocation}</Text>
        </Card.Content>
      </Card>
    )
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineSmall" style={styles.title}>
            {t('devices.device')} #{device.inventory_number}
          </Text>
          
          <Divider style={styles.divider} />
          
          <View style={styles.row}>
            <Text variant="bodyLarge" style={styles.label}>{t('devices.deviceType')}:</Text>
            <Text variant="bodyLarge">{deviceType?.name || t('common.notSpecified')}</Text>
          </View>
          
          <View style={styles.row}>
            <Text variant="bodyLarge" style={styles.label}>{t('devices.brand')}:</Text>
            <Text variant="bodyLarge">{brand?.name || t('common.notSpecified')}</Text>
          </View>
          
          <View style={styles.row}>
            <Text variant="bodyLarge" style={styles.label}>{t('devices.model')}:</Text>
            <Text variant="bodyLarge">{model?.name || t('common.notSpecified')}</Text>
          </View>
          
          <View style={styles.row}>
            <Text variant="bodyLarge" style={styles.label}>{t('devices.serialNumber')}:</Text>
            <Text variant="bodyLarge">{device.serial_number}</Text>
          </View>
          
          <View style={styles.row}>
            <Text variant="bodyLarge" style={styles.label}>{t('devices.inventoryNumber')}:</Text>
            <Text variant="bodyLarge">{device.inventory_number}</Text>
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.row}>
            <Text variant="bodyLarge" style={styles.label}>{t('devices.location')}:</Text>
            <Text variant="bodyLarge">
              {getLocationName(device.current_location_type, device.current_location_id)}
            </Text>
          </View>
          
          <View style={styles.buttonRow}>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('Movement', { deviceId: device.id })}
              style={styles.button}
            >
              {t('devices.moveDevice')}
            </Button>
            <Button
              mode="outlined"
              icon="printer"
              onPress={handlePrintClick}
              style={styles.button}
            >
              {t('common.print')}
            </Button>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.historyHeader}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {t('movements.history')}
          </Text>
            {!showMovementHistory && (
            <Button
              mode="outlined"
              icon="history"
              onPress={handleLoadMovementHistory}
              style={styles.historyButton}
            >
              {t('movements.loadHistory')}
            </Button>
            )}
          </View>
          {showMovementHistory && (
            <>
              {movementsLoading ? (
                <ActivityIndicator style={styles.loader} />
              ) : movements.length === 0 ? (
                <Text variant="bodyMedium" style={styles.emptyText}>
                  {t('movements.noMovements')}
                </Text>
              ) : (
                <FlatList
                  data={movements}
                  renderItem={renderMovement}
                  keyExtractor={(item) => item.id.toString()}
                  scrollEnabled={false}
                />
              )}
            </>
          )}
        </Card.Content>
      </Card>

      <Portal>
        <Dialog visible={showFormatDialog} onDismiss={() => setShowFormatDialog(false)}>
          <Dialog.Title>Выберите формат этикетки</Dialog.Title>
          <Dialog.Content>
            <ScrollView>
              {Object.entries(LABEL_FORMATS).map(([key, format]) => (
                <List.Item
                  key={key}
                  title={format.name}
                  description={`${format.width}x${format.height} мм`}
                  left={(props) => <List.Icon {...props} icon="label" />}
                  onPress={() => handleFormatSelect(key)}
                  style={selectedFormat === key ? styles.selectedFormat : null}
                />
              ))}
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowFormatDialog(false)}>Отмена</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  button: {
    flex: 1,
  },
  sectionTitle: {
    fontWeight: 'bold',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyButton: {
    marginLeft: 8,
  },
  selectedFormat: {
    backgroundColor: '#e3f2fd',
  },
  movementCard: {
    marginBottom: 8,
    elevation: 1,
  },
  movementDate: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  movementTo: {
    marginTop: 4,
  },
  loader: {
    marginVertical: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 20,
  },
})

