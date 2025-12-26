import React, { useState, useMemo } from 'react'
import { View, FlatList, StyleSheet, Alert } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card,
  Text,
  Button,
  ActivityIndicator,
  Searchbar,
  Checkbox,
  Chip,
  ProgressBar,
} from 'react-native-paper'
import { inventoryService } from '../services/inventory'
import { referenceService } from '../services/references'

export default function InventoryDevicesListScreen({ route, navigation }) {
  const { sessionId } = route.params
  const [searchQuery, setSearchQuery] = useState('')
  const [showChecked, setShowChecked] = useState(false)
  const queryClient = useQueryClient()

  // Получаем сессию
  const { data: session } = useQuery({
    queryKey: ['inventorySession', sessionId],
    queryFn: () => inventoryService.getSession(sessionId),
  })

  // Получаем устройства сессии
  const { data: sessionDevices = [], isLoading: devicesLoading } = useQuery({
    queryKey: ['inventorySessionDevices', sessionId],
    queryFn: () => inventoryService.getSessionDevices(sessionId),
  })

  // Получаем статистику
  const { data: statistics } = useQuery({
    queryKey: ['inventoryStatistics', sessionId],
    queryFn: () => inventoryService.getSessionStatistics(sessionId),
  })

  // Получаем справочники для отображения информации об устройствах
  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: () => referenceService.getBrands(),
  })

  const { data: models = [] } = useQuery({
    queryKey: ['models'],
    queryFn: () => referenceService.getModels(),
  })

  // Мутация отметки устройства
  const checkDeviceMutation = useMutation({
    mutationFn: ({ deviceId, checked }) =>
      inventoryService.checkDevice(sessionId, deviceId, checked),
    onSuccess: () => {
      queryClient.invalidateQueries(['inventorySessionDevices', sessionId])
      queryClient.invalidateQueries(['inventoryStatistics', sessionId])
    },
    onError: (error) => {
      Alert.alert('Ошибка', error.response?.data?.detail || 'Не удалось отметить устройство')
    },
  })

  // Мутация снятия отметки
  const uncheckDeviceMutation = useMutation({
    mutationFn: ({ recordId }) => inventoryService.uncheckRecord(recordId),
    onSuccess: () => {
      queryClient.invalidateQueries(['inventorySessionDevices', sessionId])
      queryClient.invalidateQueries(['inventoryStatistics', sessionId])
    },
    onError: (error) => {
      Alert.alert('Ошибка', error.response?.data?.detail || 'Не удалось снять отметку')
    },
  })

  // Фильтрация устройств
  const filteredDevices = useMemo(() => {
    let filtered = sessionDevices

    // Фильтр по статусу проверки
    if (!showChecked) {
      filtered = filtered.filter((record) => !record.checked)
    }

    // Фильтр по поисковому запросу
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((record) => {
        const device = record.device
        return (
          device.inventory_number.toLowerCase().includes(query) ||
          device.serial_number.toLowerCase().includes(query)
        )
      })
    }

    return filtered
  }, [sessionDevices, searchQuery, showChecked])

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
                deviceId,
                checked: true,
              })
            },
          },
        ]
      )
    }
  }

  const renderDevice = ({ item }) => {
    const device = item.device
    const brand = brands.find((b) => b.id === device.brand_id)
    const model = models.find((m) => m.id === device.model_id)

    return (
      <Card
        style={[styles.deviceCard, item.checked && styles.deviceCardChecked]}
      >
        <Card.Content>
          <View style={styles.deviceHeader}>
            <View style={styles.deviceInfo}>
              <Text variant="titleMedium">{device.inventory_number}</Text>
              <Text variant="bodySmall">Сер: {device.serial_number}</Text>
              {brand && model && (
                <Text variant="bodySmall" style={styles.deviceDetails}>
                  {brand.name} {model.name}
                </Text>
              )}
            </View>
            <Checkbox
              status={item.checked ? 'checked' : 'unchecked'}
              onPress={() => handleToggleDevice(item.id, device.id, item.checked)}
            />
          </View>
          {item.checked && item.checked_at && (
            <Text variant="bodySmall" style={styles.checkedDate}>
              Проверено: {new Date(item.checked_at).toLocaleString('ru-RU')}
            </Text>
          )}
        </Card.Content>
      </Card>
    )
  }

  if (devicesLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {statistics && (
        <Card style={styles.statsCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.statsTitle}>
              Прогресс
            </Text>
            <ProgressBar
              progress={statistics.progress_percent / 100}
              color="#4caf50"
              style={styles.progressBar}
            />
            <View style={styles.statsRow}>
              <Chip icon="check-circle">Проверено: {statistics.checked_devices}</Chip>
              <Chip icon="clock-outline">Осталось: {statistics.remaining_devices}</Chip>
            </View>
          </Card.Content>
        </Card>
      )}

      <View style={styles.filters}>
        <Searchbar
          placeholder="Поиск по инв. номеру или серийному..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
        <Button
          mode={showChecked ? 'contained' : 'outlined'}
          onPress={() => setShowChecked(!showChecked)}
          icon={showChecked ? 'eye-off' : 'eye'}
          style={styles.filterButton}
        >
          {showChecked ? 'Скрыть проверенные' : 'Показать проверенные'}
        </Button>
      </View>

      <FlatList
        data={filteredDevices}
        renderItem={renderDevice}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              {searchQuery
                ? 'Ничего не найдено'
                : showChecked
                ? 'Нет проверенных устройств'
                : 'Все устройства проверены!'}
            </Text>
          </View>
        }
      />
    </View>
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
  statsCard: {
    margin: 16,
    marginBottom: 8,
    elevation: 2,
  },
  statsTitle: {
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  filters: {
    padding: 16,
    paddingBottom: 8,
  },
  searchbar: {
    marginBottom: 8,
  },
  filterButton: {
    marginTop: 8,
  },
  list: {
    padding: 16,
    paddingTop: 8,
  },
  deviceCard: {
    marginBottom: 8,
    elevation: 2,
  },
  deviceCardChecked: {
    backgroundColor: '#e8f5e9',
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceDetails: {
    color: '#666',
    marginTop: 4,
  },
  checkedDate: {
    color: '#4caf50',
    marginTop: 8,
    fontStyle: 'italic',
  },
  empty: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
  },
})

