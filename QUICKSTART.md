# Быстрый старт

## Шаг 1: Настройка базы данных PostgreSQL

```bash
# Создайте базу данных
createdb wwp_inventory

# Или через psql:
psql -U postgres
CREATE DATABASE wwp_inventory;
\q
```

## Шаг 2: Настройка Backend

```bash
cd backend

# Создайте виртуальное окружение
python -m venv venv

# Активируйте его
# На macOS/Linux:
source venv/bin/activate
# На Windows:
# venv\Scripts\activate

# Установите зависимости
pip install -r requirements.txt

# Создайте файл .env на основе .env.example
cp .env.example .env

# Отредактируйте .env и укажите правильные данные для подключения к БД
# DATABASE_URL=postgresql://user:password@localhost:5432/wwp_inventory

# Запустите сервер
uvicorn app.main:app --reload
```

Backend будет доступен на http://localhost:8000

API документация: http://localhost:8000/docs

## Шаг 3: Настройка Frontend

```bash
cd frontend

# Установите зависимости
npm install

# Запустите dev сервер
npm run dev
```

Frontend будет доступен на http://localhost:3000

## Шаг 4: Настройка Mobile (опционально)

```bash
cd mobile

# Установите зависимости
npm install

# Запустите Expo
npm start
```

Отсканируйте QR-код в приложении Expo Go или запустите на эмуляторе.

## Первый вход

1. Откройте http://localhost:3000
2. Зарегистрируйте первого пользователя через API:
   ```bash
   curl -X POST "http://localhost:8000/api/auth/register" \
     -H "Content-Type: application/json" \
     -d '{
       "username": "admin",
       "email": "admin@example.com",
       "password": "admin123",
       "role": "admin"
     }'
   ```
3. Войдите в систему с этими учетными данными

## Создание первого склада и сотрудника

После входа в систему:
1. Перейдите в "Справочники"
2. Создайте хотя бы один склад
3. Создайте хотя бы одного сотрудника
4. Теперь можно создавать устройства!

## Проверка работы

1. Создайте тип устройства (например, "Монитор")
2. Создайте бренд (например, "Dell")
3. Создайте модель для этого бренда
4. Создайте устройство с этими данными
5. Переместите устройство со склада сотруднику
6. Проверьте историю перемещений на странице устройства

## Troubleshooting

### Ошибка подключения к БД
- Проверьте, что PostgreSQL запущен
- Проверьте правильность DATABASE_URL в .env
- Убедитесь, что база данных создана

### CORS ошибки
- Проверьте CORS_ORIGINS в .env
- Убедитесь, что frontend запущен на порту из списка разрешенных

### Проблемы с мобильным приложением
- Убедитесь, что телефон и компьютер в одной сети
- Для Android эмулятора используйте 10.0.2.2 вместо localhost
- Для iOS симулятора используйте localhost



