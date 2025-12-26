import React, { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { TextInput, Button, Card, Text } from 'react-native-paper'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useMutation } from '@tanstack/react-query'
import { authService } from '../services/auth'
import { useLocale } from '../contexts/LocaleContext'

export default function LoginScreen({ navigation }) {
  const { t } = useLocale()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const loginMutation = useMutation({
    mutationFn: () => authService.login(username, password),
    onSuccess: async (data) => {
      await AsyncStorage.setItem('token', data.access_token)
      navigation.replace('Main')
    },
    onError: (error) => {
      alert(error.response?.data?.detail || t('auth.loginError'))
    },
  })

  const handleLogin = () => {
    if (!username || !password) {
      alert(t('common.fillAllFields'))
      return
    }
    loginMutation.mutate()
  }

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineMedium" style={styles.title}>
            WWP Inventory
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            {t('auth.login')}
          </Text>
          
          <TextInput
            label={t('auth.username')}
            value={username}
            onChangeText={setUsername}
            mode="outlined"
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            keyboardType="default"
            showSoftInputOnFocus={true}
          />
          
          <TextInput
            label={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            keyboardType="default"
            showSoftInputOnFocus={true}
          />
          
          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loginMutation.isPending}
            style={styles.button}
          >
            {t('auth.loginButton')}
          </Button>
        </Card.Content>
      </Card>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  card: {
    elevation: 4,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
  },
})


