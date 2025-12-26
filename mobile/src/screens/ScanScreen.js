import React, { useState } from 'react'
import { View, StyleSheet, Alert } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { Text, Button } from 'react-native-paper'
import { deviceService } from '../services/devices'

export default function ScanScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions()
  const [scanned, setScanned] = useState(false)

  const handleBarCodeScanned = async (result) => {
    if (scanned) return
    
    setScanned(true)
    
    const data = result.data
    
    try {
      const devices = await deviceService.getAll()
      const device = devices.find(d => d.inventory_number === data || d.serial_number === data)
      
      if (device) {
        navigation.navigate('DeviceDetail', { deviceId: device.id })
      } else {
        Alert.alert('Не найдено', 'Устройство с таким номером не найдено')
        setTimeout(() => setScanned(false), 2000)
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось найти устройство')
      setTimeout(() => setScanned(false), 2000)
    }
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

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'ean13', 'ean8', 'code128'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />
      <View style={styles.overlay}>
        <View style={styles.scanArea}>
          <Text style={styles.instruction}>
            Наведите камеру на QR-код или штрих-код инвентарного номера
          </Text>
        </View>
        {scanned && (
          <Button
            mode="contained"
            onPress={() => setScanned(false)}
            style={styles.button}
          >
            Сканировать снова
          </Button>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 300,
    height: 300,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  instruction: {
    color: '#fff',
    textAlign: 'center',
    padding: 20,
  },
  button: {
    marginTop: 20,
  },
  message: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
  },
})


