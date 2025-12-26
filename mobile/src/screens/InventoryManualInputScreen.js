import React, { useState } from 'react'
import { View, StyleSheet, Alert } from 'react-native'
import { Text, Button, TextInput, ActivityIndicator } from 'react-native-paper'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryService } from '../services/inventory'

export default function InventoryManualInputScreen({ route, navigation }) {
  const { sessionId } = route.params
  const [inventoryNumber, setInventoryNumber] = useState('')
  const queryClient = useQueryClient()

  // Получаем устройства сессии
  const { data: sessionDevices = [], isLoading: devicesLoading } = useQuery({
    queryKey: ['inventorySessionDevices', sessionId],
    queryFn: () => inventoryService.getSessionDevices(sessionId),
  })

  // Мутация отметки устройства
  const checkDeviceMutation = useMutation({
    mutationFn: ({ recordId, notes }) =>
      inventoryService.checkRecord(recordId, notes),
    onSuccess: (data) => {
      const inventoryNum = (data.device && data.device.inventory_number) || inventoryNumber.trim()
      Alert.alert('Успех', `Устройство ${inventoryNum} проверено!`)
      queryClient.invalidateQueries(['inventorySessionDevices', sessionId])
      queryClient.invalidateQueries(['inventorySessionStatistics', sessionId])
      setInventoryNumber('')
    },
    onError: (error) => {
      Alert.alert('Ошибка', error.response?.data?.detail || 'Не удалось отметить устройство')
    },
  })

  const handleCheckDevice = () => {
    if (!inventoryNumber.trim()) {
      Alert.alert('Ошибка', 'Введите инвентарный номер')
      return
    }

    const trimmedNumber = inventoryNumber.trim()

    // Ищем устройство в сессии по инвентарному номеру
    const record = sessionDevices.find(
      (r) => (r.device && r.device.inventory_number === trimmedNumber)
    )

    if (!record) {
      Alert.alert(
        'Не найдено',
        `Устройство с номером ${trimmedNumber} не найдено в этой сессии инвентаризации`
      )
      return
    }

    if (record.checked) {
      Alert.alert('Уже проверено', `Устройство ${trimmedNumber} уже было проверено`)
      return
    }

    // Отмечаем устройство как проверенное
    checkDeviceMutation.mutate({ recordId: record.id })
  }

  if (devicesLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <Text style={styles.message}>Загрузка устройств...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text variant="titleLarge" style={styles.title}>
          Ввод инвентарного номера
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Введите инвентарный номер устройства для проверки
        </Text>
        <TextInput
          label="Инвентарный номер"
          value={inventoryNumber}
          onChangeText={setInventoryNumber}
          mode="outlined"
          style={styles.input}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={handleCheckDevice}
        />
        <Button
          mode="contained"
          onPress={handleCheckDevice}
          loading={checkDeviceMutation.isPending}
          disabled={!inventoryNumber.trim()}
          style={styles.button}
        >
          Проверить устройство
        </Button>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.button}
        >
          Назад
        </Button>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
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
  input: {
    marginBottom: 16,
  },
  button: {
    marginBottom: 12,
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
})

