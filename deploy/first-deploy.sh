#!/bin/bash

# Скрипт для первого развертывания
# ВАЖНО: Укажите URL вашего GitHub репозитория перед запуском

set -e

# ============================================
# КОНФИГУРАЦИЯ - ОБЯЗАТЕЛЬНО ОТРЕДАКТИРУЙТЕ
# ============================================
SERVER_HOST="88.99.124.218"
SERVER_USER="root"
# Пароль можно указать через переменную окружения: export SERVER_PASS="your_password"
SERVER_PASS="${SERVER_PASS:-hVjrf8Ux}"  # ВАЖНО: После первого развертывания используйте SSH ключи
GIT_REPO_URL="${GIT_REPO_URL:-https://github.com/rakhatutebayev/wwp-inventory.git}"
PROJECT_DIR="/opt/wwp-ams"
DOMAIN="ams.it-uae.com"

# Проверка конфигурации
if [ -z "$GIT_REPO_URL" ]; then
    echo "ОШИБКА: Необходимо указать GIT_REPO_URL в скрипте!"
    exit 1
fi

echo "Начало развертывания на сервер ${SERVER_HOST}"

# Установка sshpass если его нет (для использования пароля)
if ! command -v sshpass &> /dev/null; then
    echo "Установка sshpass..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install hudochenkov/sshpass/sshpass 2>/dev/null || echo "Установите sshpass вручную: brew install hudochenkov/sshpass/sshpass"
    else
        sudo apt-get install -y sshpass || sudo yum install -y sshpass
    fi
fi

# Функция для выполнения команд на сервере
ssh_exec() {
    sshpass -p "${SERVER_PASS}" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_HOST} "$@"
}

scp_exec() {
    sshpass -p "${SERVER_PASS}" scp -o StrictHostKeyChecking=no "$@"
}

# 1. Первоначальная настройка сервера
echo "1. Первоначальная настройка сервера..."
ssh_exec "
    # Установка Docker
    if ! command -v docker &> /dev/null; then
        curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
        sh /tmp/get-docker.sh
        systemctl enable docker
        systemctl start docker
    fi

    # Установка Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
    fi

    # Установка Git, Nginx, Certbot
    apt-get update
    apt-get install -y git nginx certbot python3-certbot-nginx

    # Создание директории проекта
    mkdir -p ${PROJECT_DIR}
"

# 2. Клонирование репозитория
echo "2. Клонирование репозитория..."
ssh_exec "
    cd ${PROJECT_DIR}
    if [ -d .git ]; then
        git pull
    else
        git clone ${GIT_REPO_URL} .
    fi
"

# 3. Создание .env файла
echo "3. Создание .env файла..."
ssh_exec "
    cd ${PROJECT_DIR}
    if [ ! -f .env ]; then
        cat > .env << 'EOF'
POSTGRES_USER=wwp_ams
POSTGRES_PASSWORD=$(openssl rand -hex 32)
POSTGRES_DB=wwp_ams
SECRET_KEY=$(openssl rand -hex 32)
EOF
        echo '.env файл создан. Сохраните пароли!'
        cat .env
    fi
"

# 4. Копирование docker-compose.prod.yml
echo "4. Настройка docker-compose..."
scp_exec docker-compose.prod.yml ${SERVER_USER}@${SERVER_HOST}:${PROJECT_DIR}/docker-compose.yml

# 5. Сборка и запуск контейнеров
echo "5. Сборка и запуск контейнеров..."
ssh_exec "
    cd ${PROJECT_DIR}
    docker-compose down || true
    docker-compose build --no-cache
    docker-compose up -d
    
    echo 'Ожидание запуска сервисов...'
    sleep 15
"

# 6. Настройка Nginx
echo "6. Настройка Nginx..."
scp_exec deploy/nginx.conf ${SERVER_USER}@${SERVER_HOST}:/etc/nginx/sites-available/ams.conf

ssh_exec "
    # Удаление старой конфигурации если есть
    rm -f /etc/nginx/sites-enabled/ams.conf
    
    # Создание символической ссылки
    ln -sf /etc/nginx/sites-available/ams.conf /etc/nginx/sites-enabled/ams.conf
    
    # Временно отключаем SSL для первоначальной настройки
    sed -i 's|ssl_certificate|#ssl_certificate|g' /etc/nginx/sites-available/ams.conf
    sed -i 's|listen 443|listen 80|g' /etc/nginx/sites-available/ams.conf || true
    
    # Проверка конфигурации
    nginx -t && systemctl reload nginx || echo 'Ошибка конфигурации nginx'
"

# 7. Установка SSL (после настройки DNS)
echo "7. Установка SSL сертификата..."
echo "ВАЖНО: Убедитесь, что DNS записи для ${DOMAIN} указывают на ${SERVER_HOST}"
read -p "Нажмите Enter после настройки DNS для продолжения установки SSL..." 

ssh_exec "
    certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --non-interactive --agree-tos --email rakhat.utebayev@gmail.com --redirect || echo 'SSL не установлен. Установите вручную после настройки DNS.'
"

echo ""
echo "============================================"
echo "Развертывание завершено!"
echo "============================================"
echo "Домен: http://${DOMAIN}"
echo "Проект: ${PROJECT_DIR}"
echo ""
echo "Следующие шаги:"
echo "1. Настройте DNS записи для ${DOMAIN}"
echo "2. Если SSL не установлен, выполните:"
echo "   ssh ${SERVER_USER}@${SERVER_HOST}"
echo "   certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
echo "3. Проверьте логи: docker-compose -f ${PROJECT_DIR}/docker-compose.yml logs"

