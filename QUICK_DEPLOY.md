# Быстрое развертывание на продакшн

## Вариант 1: Автоматическое развертывание (первый раз)

1. **Создайте GitHub репозиторий** (если еще не создан):
   - Создайте новый репозиторий на GitHub
   - Запомните URL (например: `https://github.com/rakhat-utebayev/wwp-inventory.git`)

2. **Инициализируйте git в проекте:**
   ```bash
   cd /Users/rakhat/Documents/webhosting/wwp-inventory
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/wwp-inventory.git
   git push -u origin main
   ```

3. **Отредактируйте deploy/first-deploy.sh:**
   ```bash
   # Откройте файл и укажите GIT_REPO_URL
   nano deploy/first-deploy.sh
   # Измените строку: GIT_REPO_URL="https://github.com/YOUR_USERNAME/wwp-inventory.git"
   ```

4. **Запустите скрипт развертывания:**
   ```bash
   chmod +x deploy/first-deploy.sh
   ./deploy/first-deploy.sh
   ```

## Вариант 2: Ручное развертывание

### Шаг 1: Подключение к серверу

```bash
ssh root@88.99.124.218
# Пароль: hVjrf8Ux
```

### Шаг 2: Установка необходимого ПО

```bash
# Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
systemctl enable docker
systemctl start docker

# Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Git, Nginx, Certbot
apt-get update
apt-get install -y git nginx certbot python3-certbot-nginx
```

### Шаг 3: Клонирование проекта

```bash
mkdir -p /opt/wwp-ams
cd /opt/wwp-ams
git clone https://github.com/YOUR_USERNAME/wwp-inventory.git .
```

### Шаг 4: Создание .env файла

```bash
cd /opt/wwp-ams
cat > .env << EOF
POSTGRES_USER=wwp_ams
POSTGRES_PASSWORD=$(openssl rand -hex 32)
POSTGRES_DB=wwp_ams
SECRET_KEY=$(openssl rand -hex 32)
EOF

# Сохраните пароли!
cat .env
```

### Шаг 5: Настройка docker-compose

```bash
cd /opt/wwp-ams
cp docker-compose.prod.yml docker-compose.yml
```

### Шаг 6: Запуск контейнеров

```bash
cd /opt/wwp-ams
docker-compose build
docker-compose up -d

# Проверка статуса
docker-compose ps
docker-compose logs -f
```

### Шаг 7: Настройка Nginx

```bash
# Копирование конфигурации
cp /opt/wwp-ams/deploy/nginx.conf /etc/nginx/sites-available/ams.conf

# Временно отключите SSL в конфигурации для первого запуска
nano /etc/nginx/sites-available/ams.conf
# Закомментируйте строки с ssl_certificate и измените listen 443 на listen 80

# Активация конфигурации
ln -sf /etc/nginx/sites-available/ams.conf /etc/nginx/sites-enabled/ams.conf
nginx -t
systemctl reload nginx
```

### Шаг 8: Настройка DNS

Настройте DNS записи у вашего провайдера:

```
A     ams.it-uae.com         88.99.124.218
A     www.ams.it-uae.com     88.99.124.218
```

Подождите несколько минут для распространения DNS.

### Шаг 9: Установка SSL сертификата

```bash
certbot --nginx -d ams.it-uae.com -d www.ams.it-uae.com --non-interactive --agree-tos --email rakhat.utebayev@gmail.com --redirect
```

### Шаг 10: Проверка

Откройте в браузере: `https://ams.it-uae.com`

## Обновление приложения

После изменений в коде:

```bash
ssh root@88.99.124.218
cd /opt/wwp-ams
git pull
docker-compose build
docker-compose up -d
```

## Полезные команды

```bash
# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose down

# Перезапуск
docker-compose restart

# Бэкап БД
docker exec wwp_ams_db pg_dump -U wwp_ams wwp_ams > backup_$(date +%Y%m%d).sql
```

