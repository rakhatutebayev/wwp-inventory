import React, { useState } from 'react'
import { View, FlatList, StyleSheet, Alert } from 'react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, Text, Searchbar, ActivityIndicator, FAB, IconButton } from 'react-native-paper'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { deviceService } from '../services/devices'
import { referenceService } from '../services/references'
import { reset } from '../services/navigation'
import { useLocale } from '../contexts/LocaleContext'

export default function DevicesScreen({ navigation }) {
  const { t } = useLocale()
  const [searchQuery, setSearchQuery] = useState('')
  const queryClient = useQueryClient()

  const handleLogout = async () => {
    Alert.alert(
      t('auth.logout'),
      t('auth.logoutConfirm'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('auth.logout'),
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('token')
            queryClient.clear() // Очищаем все кэшированные данные
            reset('Login')
          },
        },
      ]
    )
  }

  // Устанавливаем кнопку выхода в заголовок и обновляем заголовок при смене языка
  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: t('devices.title'),
      headerRight: () => (
        <IconButton
          icon="logout"
          iconColor="#6200ee"
          size={24}
          onPress={handleLogout}
        />
      ),
    })
  }, [navigation, t])

  const { data: devices = [], isLoading } = useQuery({
    queryKey: ['devices'],
    queryFn: () => deviceService.getAll(),
  })

  const { data: deviceTypes = [] } = useQuery({
    queryKey: ['deviceTypes'],
    queryFn: () => referenceService.getDeviceTypes(),
  })

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: () => referenceService.getBrands(),
  })

  const filteredDevices = devices.filter(device => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      device.inventory_number.toLowerCase().includes(query) ||
      device.serial_number.toLowerCase().includes(query)
    )
  })

  const renderDevice = ({ item }) => {
    const deviceType = deviceTypes.find(t => t.id === item.device_type_id)
    const brand = brands.find(b => b.id === item.brand_id)
    
    return (
      <Card
        style={styles.card}
        onPress={() => navigation.navigate('DeviceDetail', { deviceId: item.id })}
      >
        <Card.Content>
          <Text variant="titleMedium">{t('devices.inventoryNumber')}: {item.inventory_number}</Text>
          <Text variant="bodyMedium">{t('devices.serialNumber')}: {item.serial_number}</Text>
          <Text variant="bodySmall" style={styles.meta}>
            {deviceType?.name} • {brand?.name}
          </Text>
          <Text variant="bodySmall" style={styles.location}>
            {item.current_location_type === 'employee' 
              ? `${t('devices.atEmployee')} #${item.current_location_id}`
              : `${t('devices.atWarehouse')} #${item.current_location_id}`}
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

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder={t('devices.searchPlaceholder')}
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />
      <FlatList
        data={filteredDevices}
        renderItem={renderDevice}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
      />
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('CreateDevice')}
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
  searchbar: {
    margin: 16,
  },
  list: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
    elevation: 2,
  },
  meta: {
    marginTop: 4,
    color: '#666',
  },
  location: {
    marginTop: 4,
    color: '#888',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 70, // Учитываем высоту bottom tab bar
    backgroundColor: '#6200ee',
  },
})


