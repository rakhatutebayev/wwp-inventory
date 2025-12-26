# Скрипты развертывания

## setup-server.sh

Скрипт для первоначальной настройки сервера. Устанавливает:
- Docker и Docker Compose
- Git
- Nginx
- Certbot

**Использование:**
```bash
chmod +x deploy/setup-server.sh
scp deploy/setup-server.sh root@88.99.124.218:/tmp/
ssh root@88.99.124.218 "chmod +x /tmp/setup-server.sh && /tmp/setup-server.sh"
```

## deploy.sh

Скрипт для автоматического развертывания приложения.

**Перед использованием:**
1. Убедитесь, что GitHub репозиторий создан
2. Отредактируйте `GIT_REPO_URL` в скрипте
3. Настройте SSH ключи для доступа к серверу без пароля (или используйте sshpass)

**Использование:**
```bash
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

## nginx.conf

Конфигурация Nginx для продакшн сервера с поддержкой SSL.

**Размещение:** `/etc/nginx/sites-available/ams.conf`
**Символическая ссылка:** `/etc/nginx/sites-enabled/ams.conf`

