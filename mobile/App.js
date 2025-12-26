import React, { useRef } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PaperProvider } from 'react-native-paper'
import { LocaleProvider, useLocale } from './src/contexts/LocaleContext'
import LoginScreen from './src/screens/LoginScreen'
import MainTabs from './src/navigation/MainTabs'
import ScanScreen from './src/screens/ScanScreen'
import MovementsHistoryScreen from './src/screens/MovementsHistoryScreen'
import InventoryScanScreen from './src/screens/InventoryScanScreen'
import InventoryDevicesListScreen from './src/screens/InventoryDevicesListScreen'
import InventoryManualInputScreen from './src/screens/InventoryManualInputScreen'
import { navigationRef } from './src/services/navigation'

const Stack = createNativeStackNavigator()
const queryClient = new QueryClient()

function AppNavigator() {
  const { t } = useLocale()
  
  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator 
        initialRouteName="Login" 
        screenOptions={{ 
          headerShown: true,
          headerBackTitleVisible: false,
          headerBackVisible: true, // Показывать кнопку назад явно для всех экранов
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen 
          name="Scan" 
          component={ScanScreen} 
          options={{ 
            title: t('scan.scanQR'),
            headerBackVisible: true,
          }} 
        />
        <Stack.Screen 
          name="MovementsHistory" 
          component={MovementsHistoryScreen} 
          options={{ 
            title: t('movements.history'),
            headerBackVisible: true,
          }} 
        />
        <Stack.Screen 
          name="InventoryScan" 
          component={InventoryScanScreen} 
          options={{ 
            title: t('inventory.scanForInventory'),
            headerBackVisible: true,
          }} 
        />
        <Stack.Screen 
          name="InventoryManualInput" 
          component={InventoryManualInputScreen} 
          options={{ 
            title: t('inventory.manualInputTitle'),
            headerBackVisible: true,
          }} 
        />
        <Stack.Screen 
          name="InventoryDevices" 
          component={InventoryDevicesListScreen} 
          options={{ 
            title: t('inventory.devicesList'),
            headerBackVisible: true,
          }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <PaperProvider>
          <AppNavigator />
        </PaperProvider>
      </LocaleProvider>
    </QueryClientProvider>
  )
}


