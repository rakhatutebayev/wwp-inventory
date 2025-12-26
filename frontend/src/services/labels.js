import api from './api'

export const labelService = {
  printLabels: (deviceIds, format = '38x21', autoPrint = false) => {
    const ids = Array.isArray(deviceIds) ? deviceIds.join(',') : deviceIds
    const token = localStorage.getItem('token')
    const baseURL = api.defaults.baseURL || 'http://localhost:8000'
    
    // Получаем HTML страницы для печати
    fetch(`${baseURL}/api/labels/print?device_ids=${ids}&format=${format}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
    .then(response => response.text())
    .then(html => {
      const printWindow = window.open('', '_blank', 'width=800,height=600')
      if (printWindow) {
        printWindow.document.write(html)
        printWindow.document.close()
        
        // Если autoPrint = true, автоматически открываем диалог печати
        // Иначе показываем предпросмотр с кнопкой печати
        if (autoPrint) {
          printWindow.onload = () => {
            setTimeout(() => {
              printWindow.print()
            }, 500)
          }
        }
      }
    })
    .catch(error => {
      console.error('Ошибка при загрузке страницы печати:', error)
      alert('Ошибка при загрузке страницы печати. Проверьте подключение к серверу.')
    })
  },
  
  // Использование Print API если доступен (Chrome/Edge)
  printWithPrinterSelection: async (deviceIds, format = '38x21') => {
    const ids = Array.isArray(deviceIds) ? deviceIds.join(',') : deviceIds
    const token = localStorage.getItem('token')
    const baseURL = api.defaults.baseURL || 'http://localhost:8000'
    
    // Проверяем поддержку Print API
    if ('navigator' in window && 'print' in navigator) {
      try {
        // Используем новый Print API (экспериментальный)
        const response = await fetch(`${baseURL}/api/labels/print?device_ids=${ids}&format=${format}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
        const html = await response.text()
        
        // Создаем blob и открываем
        const blob = new Blob([html], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        
        // Пытаемся использовать Print API
        if (navigator.print) {
          await navigator.print(url)
        } else {
          // Fallback на стандартный метод
          labelService.printLabels(deviceIds, format, false)
        }
      } catch (error) {
        console.error('Ошибка Print API:', error)
        // Fallback на стандартный метод
        labelService.printLabels(deviceIds, format, false)
      }
    } else {
      // Fallback на стандартный метод
      labelService.printLabels(deviceIds, format, false)
    }
  },
  
  getQRCode: async (deviceId, size = 200) => {
    const response = await api.get(`/api/labels/qr/${deviceId}`, {
      params: { size }
    })
    return response.data
  },
}

