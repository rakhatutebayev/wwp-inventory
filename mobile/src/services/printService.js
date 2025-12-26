import * as Print from 'expo-print'
import api from './api'

/**
 * Доступные форматы меток
 */
export const LABEL_FORMATS = {
  "38x21": { width: 38, height: 21, name: "38x21 мм" },
  "40x30": { width: 40, height: 30, name: "40x30 мм (SUPVAN T50M Pro)" },
  "50x25": { width: 50, height: 25, name: "50x25 мм" },
  "50x40": { width: 50, height: 40, name: "50x40 мм (SUPVAN T50M Pro)" },
  "70x36": { width: 70, height: 36, name: "70x36 мм" },
  "100x50": { width: 100, height: 50, name: "100x50 мм" },
}

/**
 * Вычисляет оптимальные размеры для авто-подгонки
 */
const calculateAutoFitSizes = (formatSettings, labelData) => {
  const { width, height } = formatSettings
  const padding = 2 // мм отступы
  const availableWidth = width - padding * 2
  const availableHeight = height - padding * 2
  
  // Оцениваем длину самого длинного текста
  const texts = [
    labelData.model_name || '',
    `Сер: ${labelData.serial_number || ''}`,
    `Инв: ${labelData.inventory_number || ''}`
  ]
  const maxTextLength = Math.max(...texts.map(t => t.length))
  
  // Базовые пропорции (QR код занимает примерно 60% высоты)
  let qrSize = Math.min(availableWidth * 0.7, availableHeight * 0.6)
  
  // Если текст очень длинный, уменьшаем QR код
  if (maxTextLength > 20) {
    qrSize = Math.min(qrSize, availableWidth * 0.6)
  }
  
  // Вычисляем размер шрифта на основе доступного пространства
  // Базовый расчет: примерно 1pt на каждые 3-4мм ширины, но с учетом длины текста
  let baseFontSize = Math.min(availableWidth / (maxTextLength * 0.4), (availableHeight - qrSize - 4) / 6)
  baseFontSize = Math.max(6, Math.min(16, baseFontSize)) // Ограничиваем от 6 до 16pt
  
  // Для заголовка (модель) используем чуть больший шрифт
  const titleFontSize = Math.min(baseFontSize * 1.2, 14)
  
  // Для серийного номера чуть меньше
  const serialFontSize = Math.max(baseFontSize * 0.9, 6)
  
  // Для инвентарного номера (важная информация) - средний размер
  const inventoryFontSize = Math.max(baseFontSize, 7)
  
  return {
    qrSize: Math.max(15, Math.min(qrSize, availableHeight * 0.6)),
    titleFontSize: Math.round(titleFontSize * 10) / 10,
    serialFontSize: Math.round(serialFontSize * 10) / 10,
    inventoryFontSize: Math.round(inventoryFontSize * 10) / 10,
  }
}

/**
 * Генерирует HTML для печати метки с авто-подгонкой размеров
 */
const generateLabelHTML = (labelData, format = '38x21') => {
  const formatSettings = LABEL_FORMATS[format] || LABEL_FORMATS["38x21"]
  const sizes = calculateAutoFitSizes(formatSettings, labelData)
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page {
          size: ${formatSettings.width}mm ${formatSettings.height}mm;
          margin: 0;
        }
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          padding: 2mm;
          width: ${formatSettings.width}mm;
          height: ${formatSettings.height}mm;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-family: Arial, sans-serif;
          overflow: hidden;
        }
        .container {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          gap: 0.5mm;
        }
        .qr-code {
          width: ${sizes.qrSize}mm;
          height: ${sizes.qrSize}mm;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .qr-code img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .text-container {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.3mm;
          flex: 1;
          overflow: hidden;
        }
        .model {
          font-size: ${sizes.titleFontSize}pt;
          font-weight: bold;
          text-align: center;
          line-height: 1.2;
          word-wrap: break-word;
          overflow-wrap: break-word;
          max-width: 100%;
        }
        .serial {
          font-size: ${sizes.serialFontSize}pt;
          text-align: center;
          line-height: 1.2;
          word-wrap: break-word;
          overflow-wrap: break-word;
          max-width: 100%;
        }
        .inventory {
          font-size: ${sizes.inventoryFontSize}pt;
          font-weight: bold;
          text-align: center;
          line-height: 1.2;
          word-wrap: break-word;
          overflow-wrap: break-word;
          max-width: 100%;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="qr-code">
          <img src="${labelData.qr_code}" alt="QR Code">
        </div>
        <div class="text-container">
          <div class="model">${escapeHtml(labelData.model_name || 'Не указана')}</div>
          <div class="serial">Сер: ${escapeHtml(labelData.serial_number || 'Не указан')}</div>
          <div class="inventory">Инв: ${escapeHtml(labelData.inventory_number || 'Не указан')}</div>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Экранирует HTML для безопасности
 */
const escapeHtml = (text) => {
  if (!text) return ''
  const div = { innerHTML: '' }
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Печать метки через системный диалог выбора принтера
 */
export const printLabel = async (deviceId, format = '38x21') => {
  try {
    // Получаем данные метки с сервера
    const response = await api.get(`/api/labels/label-data/${deviceId}`)
    const labelData = response.data
    
    // Генерируем HTML с авто-подгонкой размеров
    const html = generateLabelHTML(labelData, format)
    
    // Открываем системный диалог печати
    // Это покажет список доступных принтеров включая:
    // - Phomemo M110 (если подключен через Bluetooth)
    // - SUPVAN T50M Pro (если подключен через Bluetooth)
    await Print.printAsync({
      html,
    })
  } catch (error) {
    throw new Error('Не удалось напечатать метку: ' + (error.response?.data?.detail || error.message))
  }
}

/**
 * Печать нескольких меток
 */
export const printLabels = async (deviceIds, format = '38x21') => {
  try {
    const labelsHTML = []
    
    for (const deviceId of deviceIds) {
      const response = await api.get(`/api/labels/label-data/${deviceId}`)
      const labelData = response.data
      labelsHTML.push(generateLabelHTML(labelData, format))
    }
    
    const html = labelsHTML.join('<div style="page-break-after: always;"></div>')
    
    await Print.printAsync({
      html,
    })
  } catch (error) {
    throw new Error('Не удалось напечатать метки: ' + (error.response?.data?.detail || error.message))
  }
}

