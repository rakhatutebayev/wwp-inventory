import React from 'react'
import { View, FlatList, StyleSheet } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Card, Text, ActivityIndicator } from 'react-native-paper'
import { movementService } from '../services/movements'

export default function MovementsHistoryScreen({ route }) {
  const deviceId = route?.params?.deviceId

  const { data: movements = [], isLoading } = useQuery({
    queryKey: ['movements', deviceId],
    queryFn: () => movementService.getAll(deviceId ? { device_id: deviceId } : {}),
  })

  const renderMovement = ({ item }) => {
    const fromLocation = item.from_location_type
      ? `${item.from_location_type === 'employee' ? 'Сотрудник' : 'Склад'} #${item.from_location_id}`
      : 'Новая'
    
    const toLocation = `${item.to_location_type === 'employee' ? 'Сотрудник' : 'Склад'} #${item.to_location_id}`
    
    const date = new Date(item.moved_at).toLocaleString('ru-RU')

    return (
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium">Устройство #{item.device_id}</Text>
          <Text variant="bodyMedium">Откуда: {fromLocation}</Text>
          <Text variant="bodyMedium">Куда: {toLocation}</Text>
          <Text variant="bodySmall" style={styles.date}>
            {date}
          </Text>
        </Card.Content>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (movements.length === 0) {
    return (
      <View style={styles.center}>
        <Text>Нет перемещений</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={movements}
        renderItem={renderMovement}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
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
  list: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
    elevation: 2,
  },
  date: {
    marginTop: 8,
    color: '#666',
  },
})



