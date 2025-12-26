# Docker Setup

## Быстрый старт

### Запуск проекта

```bash
# Запуск всех сервисов
docker-compose up -d

# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose down

# Остановка с удалением volumes (удалит данные БД)
docker-compose down -v
```

### Разработка

Для разработки с hot-reload:

```bash
docker-compose -f docker-compose.dev.yml up
```

## Сервисы

- **Backend**: http://localhost:8000
- **Frontend**: http://localhost:3000
- **PostgreSQL**: localhost:5432
- **API Docs**: http://localhost:8000/docs

## Первый запуск

1. Дождитесь запуска всех контейнеров
2. Создайте первого пользователя через API:
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
3. Откройте http://localhost:3000 и войдите

## Пересборка образов

```bash
# Пересборка всех образов
docker-compose build

# Пересборка конкретного сервиса
docker-compose build backend
docker-compose build frontend
```

## Полезные команды

```bash
# Просмотр статуса
docker-compose ps

# Выполнение команд в контейнере
docker-compose exec backend bash
docker-compose exec db psql -U postgres -d wwp_inventory

# Просмотр логов конкретного сервиса
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```



