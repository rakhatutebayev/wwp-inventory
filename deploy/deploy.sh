#!/bin/bash

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Конфигурация
SERVER_HOST="88.99.124.218"
SERVER_USER="root"
PROJECT_DIR="/opt/wwp-ams"
GIT_REPO_URL="${GIT_REPO_URL}"  # Должен быть установлен через переменную окружения или в скрипте
DOMAIN="ams.it-uae.com"

# Проверка конфигурации
if [ -z "$GIT_REPO_URL" ]; then
    echo "ОШИБКА: Установите GIT_REPO_URL: export GIT_REPO_URL=https://github.com/YOUR_USERNAME/wwp-inventory.git"
    exit 1
fi

echo -e "${GREEN}Начало развертывания на сервер ${SERVER_HOST}${NC}"

# Проверка подключения к серверу
echo -e "${YELLOW}Проверка подключения к серверу...${NC}"
ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_HOST} "echo 'Подключение успешно'"

# Создание директории проекта
echo -e "${YELLOW}Создание директории проекта...${NC}"
ssh ${SERVER_USER}@${SERVER_HOST} "
    mkdir -p ${PROJECT_DIR}
    cd ${PROJECT_DIR}
    
    # Клонирование или обновление репозитория
    if [ -d .git ]; then
        echo 'Обновление репозитория...'
        git pull origin main || git pull origin master
    else
        echo 'Клонирование репозитория...'
        git clone ${GIT_REPO_URL} .
    fi
"

# Копирование файлов конфигурации
echo -e "${YELLOW}Настройка конфигурации...${NC}"
scp docker-compose.prod.yml ${SERVER_USER}@${SERVER_HOST}:${PROJECT_DIR}/docker-compose.yml
scp deploy/nginx.conf ${SERVER_USER}@${SERVER_HOST}:/etc/nginx/sites-available/ams.conf

# Настройка на сервере
ssh ${SERVER_USER}@${SERVER_HOST} "
    cd ${PROJECT_DIR}
    
    # Создание .env файла если его нет
    if [ ! -f .env ]; then
        echo 'Создание .env файла...'
        cat > .env << EOF
POSTGRES_USER=wwp_ams
POSTGRES_PASSWORD=\$(openssl rand -hex 32)
POSTGRES_DB=wwp_ams
SECRET_KEY=\$(openssl rand -hex 32)
EOF
    fi
    
    # Загрузка переменных окружения
    source .env
    
    # Остановка старых контейнеров
    echo 'Остановка старых контейнеров...'
    docker-compose down || true
    
    # Сборка и запуск контейнеров
    echo 'Сборка и запуск контейнеров...'
    docker-compose build --no-cache
    docker-compose up -d
    
    # Ожидание запуска БД
    echo 'Ожидание запуска базы данных...'
    sleep 10
    
    # Применение миграций
    echo 'Применение миграций базы данных...'
    docker-compose exec -T backend alembic upgrade head || echo 'Миграции уже применены или Alembic не настроен'
    
    # Настройка nginx
    echo 'Настройка nginx...'
    ln -sf /etc/nginx/sites-available/ams.conf /etc/nginx/sites-enabled/ams.conf
    nginx -t && systemctl reload nginx || echo 'Проверьте конфигурацию nginx'
    
    # Установка SSL сертификата (Let's Encrypt)
    echo 'Установка SSL сертификата...'
    if ! certbot certificates | grep -q ${DOMAIN}; then
        certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --non-interactive --agree-tos --email rakhat.utebayev@gmail.com --redirect || echo 'Не удалось установить SSL. Установите вручную.'
    fi
    
    echo 'Развертывание завершено!'
"

echo -e "${GREEN}Развертывание завершено успешно!${NC}"
echo -e "${GREEN}Приложение доступно по адресу: https://${DOMAIN}${NC}"

