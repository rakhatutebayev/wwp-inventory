import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Icon } from 'react-native-paper'
import { useLocale } from '../contexts/LocaleContext'
import DevicesScreen from '../screens/DevicesScreen'
import DeviceDetailScreen from '../screens/DeviceDetailScreen'
import CreateDeviceScreen from '../screens/CreateDeviceScreen'
import ScanScreen from '../screens/ScanScreen'
import MovementsHistoryScreen from '../screens/MovementsHistoryScreen'
import MovementScreen from '../screens/MovementScreen'
import ReportsScreen from '../screens/ReportsScreen'
import InventoryScreen from '../screens/InventoryScreen'
import SettingsScreen from '../screens/SettingsScreen'

const Tab = createBottomTabNavigator()
const Stack = createNativeStackNavigator()

function DevicesStack() {
  const { t } = useLocale()
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerBackTitleVisible: false,
        headerBackVisible: true, // Показывать кнопку назад явно
      }}
    >
      <Stack.Screen 
        name="DevicesList" 
        component={DevicesScreen}
        options={{ 
          title: t('devices.title'), 
          headerShown: true,
          headerBackVisible: false, // Первый экран не показывает кнопку назад
        }}
      />
      <Stack.Screen
        name="DeviceDetail"
        component={DeviceDetailScreen}
        options={{ 
          title: t('devices.deviceDetails'),
          headerBackVisible: true,
        }}
      />
      <Stack.Screen
        name="CreateDevice"
        component={CreateDeviceScreen}
        options={{ 
          title: t('devices.createDevice'),
          headerBackVisible: true,
        }}
      />
      <Stack.Screen
        name="Movement"
        component={MovementScreen}
        options={{ 
          title: t('devices.moveDevice'),
          headerBackVisible: true,
        }}
      />
    </Stack.Navigator>
  )
}

export default function MainTabs() {
  const { t } = useLocale()
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#6200ee',
      }}
    >
      <Tab.Screen
        name="Devices"
        component={DevicesStack}
        options={{
          tabBarLabel: t('devices.title'),
          tabBarIcon: ({ color, size }) => (
            <Icon source="laptop" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Scan"
        component={ScanScreen}
        options={{
          tabBarLabel: t('scan.title'),
          tabBarIcon: ({ color, size }) => (
            <Icon source="qrcode-scan" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Movements"
        component={MovementsHistoryScreen}
        options={{
          tabBarLabel: t('movements.title'),
          tabBarIcon: ({ color, size }) => (
            <Icon source="swap-horizontal" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsScreen}
        options={{
          tabBarLabel: t('reports.title'),
          tabBarIcon: ({ color, size }) => (
            <Icon source="file-document" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Inventory"
        component={InventoryScreen}
        options={{
          tabBarLabel: t('inventory.title'),
          tabBarIcon: ({ color, size }) => (
            <Icon source="clipboard-check" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: t('settings.title'),
          tabBarIcon: ({ color, size }) => (
            <Icon source="cog" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  )
}

