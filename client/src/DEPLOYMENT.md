# 🚀 Развертывание NoteFlow

Руководство по развертыванию приложения NoteFlow на различных платформах.

---

## 📋 Содержание

1. [Replit](#replit) ⚡ Рекомендуется для быстрого старта
2. [Vercel](#vercel)
3. [Netlify](#netlify)
4. [GitHub Pages](#github-pages)
5. [Docker](#docker)
6. [VPS/Cloud Server](#vpscloud-server)

---

## Replit

### ⚡ Самый простой способ

#### Вариант 1: Import from GitHub

1. Откройте [replit.com](https://replit.com)
2. Нажмите **"Create Repl"**
3. Выберите **"Import from GitHub"**
4. Вставьте URL вашего репозитория
5. Нажмите **"Import from GitHub"**
6. Replit автоматически установит зависимости
7. Нажмите **"Run"** ▶️

#### Вариант 2: Upload Files

1. Откройте [replit.com](https://replit.com)
2. Нажмите **"Create Repl"**
3. Выберите **"Node.js"** template
4. Загрузите все файлы проекта
5. Нажмите **"Run"** ▶️

### Настройки

Файлы `.replit` и `replit.nix` уже настроены:
- Команда запуска: `npm run dev`
- Порт: 5173 → 80
- TypeScript language server включен

### Доступ

После запуска получите URL:
```
https://noteflow.[your-username].repl.co
```

### Преимущества Replit

✅ Нулевая конфигурация  
✅ Автоматическая установка зависимостей  
✅ Встроенный редактор кода  
✅ Простой шаринг  
✅ Бесплатный хостинг  
✅ Instant deployment  

---

## Vercel

### Предварительные требования
- GitHub аккаунт
- Vercel аккаунт

### Шаги развертывания

1. **Push в GitHub:**
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

2. **Подключить Vercel:**
   - Откройте [vercel.com](https://vercel.com)
   - Нажмите **"New Project"**
   - Import вашего GitHub репозитория
   - Настройки определятся автоматически:
     - Build Command: `npm run build`
     - Output Directory: `dist`
     - Install Command: `npm install`

3. **Deploy:**
   - Нажмите **"Deploy"**
   - Ждите сборки (~2-3 минуты)
   - Получите URL: `https://your-app.vercel.app`

### Автоматические деплои

Vercel автоматически деплоит при push в main:
```bash
git add .
git commit -m "Update feature"
git push
# Автоматически задеплоится
```

### Переменные окружения

В Vercel Dashboard → Settings → Environment Variables

---

## Netlify

### Вариант 1: Git Deploy

1. **Push в GitHub** (как выше)

2. **Подключить Netlify:**
   - Откройте [netlify.com](https://netlify.com)
   - **"New site from Git"**
   - Выберите репозиторий
   - Настройки:
     - Build command: `npm run build`
     - Publish directory: `dist`

3. **Deploy**
   - Нажмите **"Deploy site"**
   - URL: `https://your-app.netlify.app`

### Вариант 2: Drag & Drop

1. **Сборка локально:**
```bash
npm run build
```

2. **Drag & Drop:**
   - Откройте [netlify.com/drop](https://app.netlify.com/drop)
   - Перетащите папку `dist/`
   - Получите instant URL

### Netlify CLI

```bash
# Установка
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod
```

---

## GitHub Pages

### Настройка

1. **Установить gh-pages:**
```bash
npm install --save-dev gh-pages
```

2. **Добавить в package.json:**
```json
{
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  },
  "homepage": "https://[username].github.io/[repo-name]"
}
```

3. **Обновить vite.config.ts:**
```typescript
export default defineConfig({
  base: '/[repo-name]/',
  // ... остальное
});
```

### Deploy

```bash
npm run deploy
```

Сайт будет доступен на:
```
https://[username].github.io/[repo-name]
```

### GitHub Actions (автоматический deploy)

Создайте `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: '20'
          
      - name: Install
        run: npm ci
        
      - name: Build
        run: npm run build
        
      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

---

## Docker

### Создать Dockerfile

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### Создать .dockerignore

```
node_modules
dist
.git
.gitignore
*.md
```

### Build и Run

```bash
# Build
docker build -t noteflow .

# Run
docker run -p 8080:80 noteflow
```

Доступно на: `http://localhost:8080`

### Docker Compose

Создайте `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "8080:80"
    restart: unless-stopped
```

Запуск:
```bash
docker-compose up -d
```

---

## VPS/Cloud Server

### На Ubuntu/Debian сервере

#### 1. Установка Node.js

```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Проверка
node --version
npm --version
```

#### 2. Установка приложения

```bash
# Клонировать репозиторий
git clone <your-repo-url>
cd noteflow

# Установить зависимости
npm install

# Сборка
npm run build
```

#### 3. Настройка Nginx

```bash
sudo apt install nginx

# Создать конфиг
sudo nano /etc/nginx/sites-available/noteflow
```

Конфиг:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    root /path/to/noteflow/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Gzip
    gzip on;
    gzip_types text/css application/javascript;
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Активация:
```bash
sudo ln -s /etc/nginx/sites-available/noteflow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 4. SSL с Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

#### 5. PM2 для dev сервера (опционально)

Если хотите запустить `npm run dev` на сервере:

```bash
# Установка PM2
sudo npm install -g pm2

# Запуск
pm2 start "npm run dev" --name noteflow

# Автозапуск
pm2 startup
pm2 save
```

---

## 🔧 Production Оптимизация

### Build Optimization

В `vite.config.ts`:

```typescript
export default defineConfig({
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['lucide-react', 'motion'],
        },
      },
    },
  },
});
```

### Анализ Bundle

```bash
npm install --save-dev rollup-plugin-visualizer
```

В `vite.config.ts`:
```typescript
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({ open: true }),
  ],
});
```

Запуск:
```bash
npm run build
# Откроется stats.html с анализом
```

---

## 🌍 CDN

### Cloudflare

1. Добавьте ваш домен в Cloudflare
2. Обновите nameservers
3. Enable:
   - Auto Minify (JS, CSS, HTML)
   - Brotli compression
   - Rocket Loader
   - Browser Cache TTL

### AWS CloudFront

Для статических ассетов:
- Создайте S3 bucket
- Upload билда
- Создайте CloudFront distribution
- Настройте custom domain

---

## 📊 Мониторинг

### Vercel Analytics

```bash
npm install @vercel/analytics
```

В `main.tsx`:
```typescript
import { Analytics } from '@vercel/analytics/react';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <>
    <App />
    <Analytics />
  </>
);
```

### Google Analytics

```html
<!-- В index.html -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_ID');
</script>
```

---

## ✅ Checklist перед деплоем

- [ ] `npm run build` успешна
- [ ] Все тесты пройдены
- [ ] Environment variables настроены
- [ ] SSL сертификат установлен (production)
- [ ] Analytics настроена
- [ ] Error tracking настроен (Sentry)
- [ ] Backup стратегия
- [ ] Monitoring настроен
- [ ] Performance оптимизирована
- [ ] SEO meta tags добавлены

---

## 🆘 Troubleshooting

### Build fails

```bash
# Очистить кеш
rm -rf node_modules package-lock.json
npm install
npm run build
```

### 404 на перезагрузке (SPA routing)

Настройте fallback на index.html:

**Vercel:** создайте `vercel.json`:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

**Netlify:** создайте `_redirects` в `public/`:
```
/*    /index.html   200
```

### Large bundle size

- Используйте code splitting
- Lazy load компоненты
- Анализируйте bundle с visualizer
- Удалите неиспользуемые dependencies

---

## 🎉 Готово!

Ваш NoteFlow теперь в production! 🚀

Выберите платформу, которая лучше подходит для ваших нужд:
- **Replit** - быстрый старт, прототипирование
- **Vercel/Netlify** - production, автоматические деплои
- **Docker** - контроль, масштабирование
- **VPS** - полный контроль, кастомизация

---

*Последнее обновление: Ноябрь 2024*
