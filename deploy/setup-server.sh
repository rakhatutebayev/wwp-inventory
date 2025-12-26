#!/bin/bash

set -e

# Скрипт для первоначальной настройки сервера

echo "Установка необходимых пакетов..."

# Обновление системы
apt-get update
apt-get upgrade -y

# Установка Docker и Docker Compose
if ! command -v docker &> /dev/null; then
    echo "Установка Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
fi

if ! command -v docker-compose &> /dev/null; then
    echo "Установка Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Установка Git
if ! command -v git &> /dev/null; then
    apt-get install -y git
fi

# Установка Nginx
if ! command -v nginx &> /dev/null; then
    apt-get install -y nginx
    systemctl enable nginx
    systemctl start nginx
fi

# Установка Certbot для SSL
if ! command -v certbot &> /dev/null; then
    apt-get install -y certbot python3-certbot-nginx
fi

# Создание директории проекта
PROJECT_DIR="/opt/wwp-ams"
mkdir -p ${PROJECT_DIR}
chown -R ${USER}:${USER} ${PROJECT_DIR}

echo "Сервер настроен!"
echo "Теперь можно выполнить развертывание через deploy.sh"

