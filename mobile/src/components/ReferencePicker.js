import React, { useState, useMemo } from 'react'
import { View, ScrollView, StyleSheet, Alert } from 'react-native'
import {
  Button,
  Portal,
  Dialog,
  Searchbar,
  List,
  TextInput,
  ActivityIndicator,
} from 'react-native-paper'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { referenceService } from '../services/references'

export default function ReferencePicker({
  label,
  value,
  onSelect,
  referenceType, // 'deviceType', 'brand', 'model', 'employee', 'warehouse', 'company'
  brandId, // Для моделей нужен brandId
  onCreate,
  queryKey,
  getLabel = (item) => item.name || item.full_name || '',
  getDescription = (item) => item.code || item.description || '',
  createFields = [], // [{ label, key, required, type, maxLength }]
  validation = null, // Функция валидации
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showDialog, setShowDialog] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [createForm, setCreateForm] = useState({})
  const queryClient = useQueryClient()

  // Получаем список справочника
  const getQueryFn = () => {
    switch (referenceType) {
      case 'deviceType':
        return () => referenceService.getDeviceTypes()
      case 'brand':
        return () => referenceService.getBrands()
      case 'model':
        return () => referenceService.getModels(brandId)
      case 'employee':
        return () => referenceService.getEmployees()
      case 'warehouse':
        return () => referenceService.getWarehouses()
      case 'company':
        return () => referenceService.getCompanies()
      default:
        return () => Promise.resolve([])
    }
  }

  const { data: items = [], isLoading } = useQuery({
    queryKey: [queryKey, brandId].filter(Boolean),
    queryFn: getQueryFn(),
    enabled: referenceType !== 'model' || !!brandId, // Для моделей нужен brandId
  })

  // Функция создания нового элемента
  const getCreateFn = () => {
    switch (referenceType) {
      case 'deviceType':
        return (data) => referenceService.createDeviceType(data)
      case 'brand':
        return (data) => referenceService.createBrand(data)
      case 'model':
        return (data) => referenceService.createModel(data)
      case 'employee':
        return (data) => referenceService.createEmployee(data)
      case 'warehouse':
        return (data) => referenceService.createWarehouse(data)
      case 'company':
        return (data) => referenceService.createCompany(data)
      default:
        return () => Promise.resolve(null)
    }
  }

  const createMutation = useMutation({
    mutationFn: (data) => {
      const createFn = getCreateFn()
      // Для моделей добавляем brand_id в данные
      if (referenceType === 'model' && brandId) {
        return createFn({ ...data, brand_id: brandId })
      }
      return createFn(data)
    },
    onSuccess: (newItem) => {
      queryClient.invalidateQueries([queryKey])
      if (brandId) {
        queryClient.invalidateQueries(['models', brandId])
      }
      setShowCreateDialog(false)
      setCreateForm({})
      onSelect(newItem.id)
      setShowDialog(false)
      if (onCreate) onCreate(newItem)
      Alert.alert('Успех', 'Элемент добавлен в справочник')
    },
    onError: (error) => {
      Alert.alert('Ошибка', error.response?.data?.detail || 'Не удалось создать элемент')
    },
  })

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items
    const query = searchQuery.toLowerCase().trim()
    if (!query) return items
    
    return items.filter(item => {
      try {
        const label = getLabel(item) || ''
        const desc = getDescription(item) || ''
        return label.toLowerCase().includes(query) || desc.toLowerCase().includes(query)
      } catch (error) {
        console.error('Error filtering item:', error, item)
        return false
      }
    })
  }, [items, searchQuery, getLabel, getDescription])

  const selectedItem = items.find(item => item.id === value)

  const handleCreate = () => {
    if (validation) {
      const validationError = validation(createForm)
      if (validationError) {
        Alert.alert('Ошибка', validationError)
        return
      }
    }

    // Проверка обязательных полей
    const requiredFields = createFields.filter(f => f.required)
    for (const field of requiredFields) {
      if (!createForm[field.key]?.trim()) {
        Alert.alert('Ошибка', `Заполните поле: ${field.label}`)
        return
      }
    }

    createMutation.mutate(createForm)
  }

  return (
    <View style={styles.container}>
      <Button
        mode="outlined"
        onPress={() => setShowDialog(true)}
        style={styles.button}
        icon="chevron-down"
      >
        {selectedItem ? getLabel(selectedItem) : `Выберите ${label}`}
      </Button>

      <Portal>
        <Dialog
          visible={showDialog}
          onDismiss={() => setShowDialog(false)}
          style={styles.dialog}
        >
          <Dialog.Title>{label}</Dialog.Title>
          <Dialog.Content>
            <Searchbar
              placeholder="Поиск..."
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={styles.searchbar}
            />
            
            <Button
              mode="outlined"
              icon="plus"
              onPress={() => setShowCreateDialog(true)}
              style={styles.addButton}
            >
              Добавить новый
            </Button>

            {isLoading ? (
              <ActivityIndicator style={styles.loader} />
            ) : (
              <ScrollView style={styles.listContainer}>
                {filteredItems.length === 0 ? (
                  <List.Item
                    title={searchQuery.trim() ? "Ничего не найдено" : "Список пуст"}
                    description={searchQuery.trim() 
                      ? `По запросу "${searchQuery}" ничего не найдено`
                      : "Нажмите 'Добавить новый' чтобы создать элемент"
                    }
                  />
                ) : (
                  filteredItems.map(item => (
                    <List.Item
                      key={item.id}
                      title={getLabel(item)}
                      description={getDescription(item)}
                      onPress={() => {
                        onSelect(item.id)
                        setShowDialog(false)
                        setSearchQuery('')
                      }}
                      right={props => value === item.id && (
                        <List.Icon {...props} icon="check" color="#6200ee" />
                      )}
                    />
                  ))
                )}
              </ScrollView>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => {
              setShowDialog(false)
              setSearchQuery('')
            }}>Закрыть</Button>
          </Dialog.Actions>
        </Dialog>

        {/* Диалог создания нового элемента */}
        <Dialog
          visible={showCreateDialog}
          onDismiss={() => setShowCreateDialog(false)}
        >
          <Dialog.Title>Добавить новый {label}</Dialog.Title>
          <Dialog.Content>
            <ScrollView>
              {createFields.map(field => (
                <TextInput
                  key={field.key}
                  label={`${field.label}${field.required ? ' *' : ''}`}
                  value={createForm[field.key] || ''}
                  onChangeText={(text) => {
                    let processedText = text
                    if (field.type === 'numeric') {
                      processedText = text.replace(/\D/g, '')
                    }
                    if (field.maxLength) {
                      processedText = processedText.slice(0, field.maxLength)
                    }
                    setCreateForm({ ...createForm, [field.key]: processedText })
                  }}
                  mode="outlined"
                  style={styles.input}
                  keyboardType={field.type === 'numeric' ? 'numeric' : 'default'}
                  maxLength={field.maxLength}
                  autoFocus={field.autoFocus}
                />
              ))}
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => {
              setShowCreateDialog(false)
              setCreateForm({})
            }}>Отмена</Button>
            <Button
              onPress={handleCreate}
              loading={createMutation.isPending}
            >
              Создать
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  button: {
    justifyContent: 'flex-start',
  },
  dialog: {
    maxHeight: '80%',
  },
  searchbar: {
    marginBottom: 8,
  },
  addButton: {
    marginBottom: 8,
  },
  listContainer: {
    maxHeight: 300,
  },
  loader: {
    marginVertical: 20,
  },
  input: {
    marginBottom: 8,
  },
})

