import { useState, useRef, useEffect } from 'react'
import { Modal, Button, Input, Space, message } from 'antd'
import { QrcodeOutlined } from '@ant-design/icons'

export default function QRScanner({ onScan, visible, onCancel }) {
  const [scanValue, setScanValue] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (visible && inputRef.current) {
      // Фокус на поле ввода при открытии модального окна
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [visible])

  const handleScan = () => {
    if (!scanValue.trim()) {
      message.warning('Введите инвентарный номер')
      return
    }
    onScan(scanValue.trim())
    setScanValue('')
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleScan()
    }
  }

  return (
    <Modal
      title="Сканирование QR-кода"
      open={visible}
      onCancel={onCancel}
      footer={null}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div>
          <p>Введите инвентарный номер вручную или используйте сканер штрих-кодов:</p>
          <Input
            ref={inputRef}
            placeholder="Инвентарный номер (например: WWP-02/0022)"
            value={scanValue}
            onChange={(e) => setScanValue(e.target.value)}
            onPressEnter={handleKeyPress}
            autoFocus
            size="large"
          />
        </div>
        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={onCancel}>Отмена</Button>
          <Button type="primary" icon={<QrcodeOutlined />} onClick={handleScan}>
            Найти устройство
          </Button>
        </Space>
      </Space>
    </Modal>
  )
}



