import React, { useState, useEffect } from 'react'
import { View, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { 
  Card, 
  Text, 
  TextInput, 
  Button, 
  Switch, 
  Divider,
  ActivityIndicator,
  SegmentedButtons,
  List
} from 'react-native-paper'
import { getSettings, saveSettings, resetSettings, getApiUrl } from '../services/settings'
import { updateApiBaseURL } from '../services/api'
import { useLocale } from '../contexts/LocaleContext'
import AsyncStorage from '@react-native-async-storage/async-storage'

export default function SettingsScreen({ navigation }) {
  const { locale, setLocale, t } = useLocale()
  const [settings, setSettings] = useState({
    apiHost: '',
    apiPort: '8000',
    protocol: 'http',
    autoDetect: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const loadedSettings = await getSettings()
      setSettings(loadedSettings)
    } catch (error) {
      Alert.alert(t('common.error'), t('settings.loadError'))
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    // Валидация
    if (!settings.autoDetect) {
      if (!settings.apiHost || !settings.apiHost.trim()) {
        Alert.alert(t('common.error'), t('settings.enterServerAddress'))
        return
      }
      
      const port = parseInt(settings.apiPort)
      if (isNaN(port) || port < 1 || port > 65535) {
        Alert.alert(t('common.error'), t('settings.invalidPort'))
        return
      }
    }

    setSaving(true)
    try {
      const success = await saveSettings(settings)
      if (success) {
        // Обновляем API URL сразу после сохранения
        await updateApiBaseURL()
        Alert.alert(t('common.success'), t('settings.settingsSaved'))
      } else {
        Alert.alert(t('common.error'), t('settings.saveError'))
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('settings.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    Alert.alert(
      t('settings.resetSettings'),
      t('settings.resetSettingsConfirm'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('settings.resetSettings'),
          style: 'destructive',
          onPress: async () => {
            const defaultSettings = await resetSettings()
            setSettings(defaultSettings)
            Alert.alert(t('common.success'), t('settings.settingsReset'))
          },
        },
      ]
    )
  }

  const handleTestConnection = async () => {
    setTesting(true)
    try {
      const apiUrl = await getApiUrl()
      const testUrl = `${apiUrl}/health`
      
      // Создаем контроллер для таймаута
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      try {
        const response = await fetch(testUrl, {
          method: 'GET',
          signal: controller.signal,
        })
        
        clearTimeout(timeoutId)
        
        if (response && response.ok) {
          Alert.alert(t('common.success'), `${t('settings.connectionSuccess')}:\n${apiUrl}`)
        } else {
          Alert.alert(t('common.error'), `${t('settings.connectionError')}:\n${apiUrl}\n\n${t('common.status')}: ${response?.status || t('common.noResponse')}\n\n${t('settings.checkSettings')}`)
        }
      } catch (fetchError) {
        clearTimeout(timeoutId)
        if (fetchError.name === 'AbortError') {
          Alert.alert(t('common.timeout'), `${t('settings.connectionTimeout')}:\n${apiUrl}\n\n${t('settings.checkSettings')}`)
        } else {
          throw fetchError
        }
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('settings.connectionCheckError'))
    } finally {
      setTesting(false)
    }
  }

  const handleClearCache = async () => {
    Alert.alert(
      t('settings.clearCache'),
      t('settings.clearCacheConfirm'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('settings.clearCache'),
          style: 'destructive',
          onPress: async () => {
            try {
              // Очищаем AsyncStorage (кроме настроек и токена)
              const keys = await AsyncStorage.getAllKeys()
              const keysToKeep = ['app_settings', 'token', 'app_locale']
              const keysToRemove = keys.filter(key => !keysToKeep.includes(key))
              await AsyncStorage.multiRemove(keysToRemove)
              
              Alert.alert(t('common.success'), t('settings.cacheCleared'))
            } catch (error) {
              Alert.alert(t('common.error'), t('settings.clearCacheError'))
            }
          },
        },
      ]
    )
  }

  const handleLanguageChange = async (newLocale) => {
    const success = await setLocale(newLocale)
    if (success) {
      Alert.alert(t('common.success'), t('settings.languageChanged'))
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  const currentApiUrl = settings.autoDetect 
    ? (Platform.OS === 'ios' ? 'http://localhost:8000' : `http://192.168.11.153:8000`)
    : `${settings.protocol}://${settings.apiHost}:${settings.apiPort}`

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.title}>
              {t('settings.language')}
            </Text>
            
            <SegmentedButtons
              value={locale}
              onValueChange={handleLanguageChange}
              buttons={[
                { value: 'ru', label: t('settings.russian') },
                { value: 'en', label: t('settings.english') },
              ]}
              style={styles.segmentedButtons}
            />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.title}>
              {t('settings.connectionSettings')}
            </Text>
            
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text variant="bodyLarge">{t('settings.autoDetect')}</Text>
                <Text variant="bodySmall" style={styles.settingDescription}>
                  {t('settings.autoDetectDescription')}
                </Text>
              </View>
              <Switch
                value={settings.autoDetect}
                onValueChange={(value) => setSettings({ ...settings, autoDetect: value })}
              />
            </View>

            {!settings.autoDetect && (
              <>
                <Divider style={styles.divider} />
                
                <SegmentedButtons
                  value={settings.protocol}
                  onValueChange={(value) => setSettings({ ...settings, protocol: value })}
                  buttons={[
                    { value: 'http', label: 'HTTP' },
                    { value: 'https', label: 'HTTPS' },
                  ]}
                  style={styles.segmentedButtons}
                />

                <TextInput
                  label={t('settings.serverAddress')}
                  value={settings.apiHost}
                  onChangeText={(text) => setSettings({ ...settings, apiHost: text.trim() })}
                  mode="outlined"
                  style={styles.input}
                  placeholder="example.com или 192.168.1.1"
                  autoCapitalize="none"
                  autoCorrect={false}
                  right={<TextInput.Icon icon="server-network" />}
                />

                <TextInput
                  label={t('settings.port')}
                  value={settings.apiPort}
                  onChangeText={(text) => setSettings({ ...settings, apiPort: text })}
                  mode="outlined"
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="8000"
                  right={<TextInput.Icon icon="numeric" />}
                />
              </>
            )}

            <Divider style={styles.divider} />

            <View style={styles.urlPreview}>
              <Text variant="bodySmall" style={styles.urlLabel}>
                {t('settings.currentApiUrl')}
              </Text>
              <Text variant="bodyMedium" style={styles.urlValue}>
                {currentApiUrl}
              </Text>
            </View>

            <Button
              mode="outlined"
              onPress={handleTestConnection}
              loading={testing}
              disabled={testing}
              icon="network"
              style={styles.button}
            >
              {t('settings.testConnection')}
            </Button>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.title}>
              {t('settings.additional')}
            </Text>

            <Button
              mode="outlined"
              onPress={handleClearCache}
              icon="delete-sweep"
              style={styles.button}
              textColor="#f44336"
            >
              {t('settings.clearCache')}
            </Button>

            <Button
              mode="outlined"
              onPress={handleReset}
              icon="restore"
              style={styles.button}
              textColor="#ff9800"
            >
              {t('settings.resetSettings')}
            </Button>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.title}>
              {t('settings.information')}
            </Text>
            <Text variant="bodyMedium" style={styles.infoText}>
              {t('settings.appVersion')}: 1.0.0
            </Text>
            <Text variant="bodyMedium" style={styles.infoText}>
              {t('settings.platform')}: {Platform.OS === 'ios' ? 'iOS' : 'Android'}
            </Text>
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          icon="content-save"
          style={[styles.button, styles.saveButton]}
        >
          {t('settings.saveSettings')}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  title: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingDescription: {
    color: '#666',
    marginTop: 4,
  },
  divider: {
    marginVertical: 16,
  },
  input: {
    marginBottom: 16,
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  urlPreview: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  urlLabel: {
    color: '#666',
    marginBottom: 4,
  },
  urlValue: {
    fontFamily: 'monospace',
    color: '#333',
  },
  button: {
    marginBottom: 12,
  },
  saveButton: {
    marginTop: 8,
    marginBottom: 32,
  },
  infoText: {
    marginBottom: 8,
    color: '#666',
  },
})

