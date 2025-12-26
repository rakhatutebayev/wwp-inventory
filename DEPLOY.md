# Инструкция по развертыванию на продакшн сервере

## Информация о сервере

- **Хост:** 88.99.124.218
- **Пользователь:** root
- **Домен:** ams.it-uae.com
- **Директория проекта:** /opt/wwp-ams

## Предварительные требования

1. На сервере должны быть установлены:
   - Docker и Docker Compose
   - Git
   - Nginx
   - Certbot (для SSL)

2. GitHub репозиторий должен быть создан и доступен

## Шаг 1: Настройка GitHub репозитория

Если репозиторий еще не создан:

```bash
cd /Users/rakhat/Documents/webhosting/wwp-inventory

# Инициализация git (если еще не инициализирован)
git init

# Добавление файлов
git add .

# Коммит
git commit -m "Initial commit"

# Добавление remote (замените YOUR_USERNAME на ваш GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/wwp-inventory.git

# Push в GitHub
git branch -M main
git push -u origin main
```

## Шаг 2: Первоначальная настройка сервера

Выполните на сервере (можно через SSH):

```bash
# Скопируйте setup-server.sh на сервер
scp deploy/setup-server.sh root@88.99.124.218:/tmp/
ssh root@88.99.124.218 "chmod +x /tmp/setup-server.sh && /tmp/setup-server.sh"
```

Или вручную установите необходимые пакеты.

## Шаг 3: Настройка deploy.sh

Отредактируйте файл `deploy/deploy.sh` и укажите правильный URL GitHub репозитория:

```bash
GIT_REPO_URL="https://github.com/YOUR_USERNAME/wwp-inventory.git"
```

## Шаг 4: Создание .env файла на сервере

Подключитесь к серверу и создайте файл `.env` в директории проекта:

```bash
ssh root@88.99.124.218

# Создание директории проекта
mkdir -p /opt/wwp-ams
cd /opt/wwp-ams

# Создание .env файла
cat > .env << EOF
POSTGRES_USER=wwp_ams
POSTGRES_PASSWORD=$(openssl rand -hex 32)
POSTGRES_DB=wwp_ams
SECRET_KEY=$(openssl rand -hex 32)
EOF
```

**ВАЖНО:** Сохраните пароли в безопасном месте!

## Шаг 5: Развертывание

Выполните скрипт развертывания:

```bash
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

Или выполните команды вручную:

```bash
# 1. Клонирование репозитория
ssh root@88.99.124.218 "cd /opt && git clone https://github.com/YOUR_USERNAME/wwp-inventory.git wwp-ams"

# 2. Копирование конфигурации
scp docker-compose.prod.yml root@88.99.124.218:/opt/wwp-ams/docker-compose.yml

# 3. Запуск контейнеров
ssh root@88.99.124.218 "cd /opt/wwp-ams && docker-compose up -d --build"

# 4. Настройка nginx
scp deploy/nginx.conf root@88.99.124.218:/etc/nginx/sites-available/ams.conf
ssh root@88.99.124.218 "
    ln -sf /etc/nginx/sites-available/ams.conf /etc/nginx/sites-enabled/ams.conf
    nginx -t && systemctl reload nginx
"

# 5. Установка SSL сертификата
ssh root@88.99.124.218 "certbot --nginx -d ams.it-uae.com -d www.ams.it-uae.com --non-interactive --agree-tos --email rakhat.utebayev@gmail.com --redirect"
```

## Шаг 6: Настройка DNS

Убедитесь, что DNS записи для домена `ams.it-uae.com` указывают на IP адрес сервера `88.99.124.218`:

```
A     ams.it-uae.com         88.99.124.218
A     www.ams.it-uae.com     88.99.124.218
```

## Обновление приложения

Для обновления приложения после изменений в коде:

```bash
ssh root@88.99.124.218 "cd /opt/wwp-ams && git pull && docker-compose up -d --build"
```

Или используйте скрипт:

```bash
./deploy/deploy.sh
```

## Проверка статуса

```bash
# Статус контейнеров
ssh root@88.99.124.218 "cd /opt/wwp-ams && docker-compose ps"

# Логи
ssh root@88.99.124.218 "cd /opt/wwp-ams && docker-compose logs -f"

# Статус nginx
ssh root@88.99.124.218 "systemctl status nginx"
```

## Резервное копирование базы данных

```bash
# Создание бэкапа
ssh root@88.99.124.218 "docker exec wwp_ams_db pg_dump -U wwp_ams wwp_ams > /opt/wwp-ams/backup_$(date +%Y%m%d_%H%M%S).sql"

# Восстановление из бэкапа
ssh root@88.99.124.218 "docker exec -i wwp_ams_db psql -U wwp_ams wwp_ams < /opt/wwp-ams/backup_YYYYMMDD_HHMMSS.sql"
```

## Безопасность

1. Не храните пароли в репозитории
2. Используйте сильные пароли для базы данных
3. Регулярно обновляйте систему и контейнеры
4. Настройте firewall (UFW):
   ```bash
   ufw allow 22/tcp
   ufw allow 80/tcp
   ufw allow 443/tcp
   ufw enable
   ```

## Структура проекта на сервере

```
/opt/wwp-ams/
├── .env                    # Переменные окружения (не в git)
├── docker-compose.yml      # Конфигурация Docker Compose
├── backend/                # Backend код
├── frontend/               # Frontend код
└── deploy/                 # Скрипты развертывания
```

