import React from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Card, Text, ActivityIndicator } from 'react-native-paper'
import { reportService } from '../services/reports'

export default function ReportsScreen() {
  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['reportLocations'],
    queryFn: () => reportService.getLocations(),
  })

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineSmall" style={styles.title}>
            Отчет по локациям
          </Text>
          
          {locations.map((location, index) => (
            <View key={index} style={styles.locationItem}>
              <Text variant="titleMedium">
                {location.location_type === 'employee' ? 'Сотрудник' : 'Склад'}: {location.location_name}
              </Text>
              {location.phone_extension && (
                <Text variant="bodyMedium">Телефон: {location.phone_extension}</Text>
              )}
              <Text variant="bodyMedium">Устройств: {location.device_count}</Text>
              
              {location.devices && location.devices.length > 0 && (
                <View style={styles.devicesList}>
                  {location.devices.map(device => (
                    <Text key={device.id} variant="bodySmall" style={styles.deviceItem}>
                      • Инв. №: {device.inventory_number}, Серийный: {device.serial_number}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          ))}
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
    marginBottom: 16,
  },
  locationItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  devicesList: {
    marginTop: 8,
    paddingLeft: 16,
  },
  deviceItem: {
    marginTop: 4,
  },
})

