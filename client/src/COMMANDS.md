# ⚡ Команды и шпаргалка

Быстрый справочник по командам и операциям в NoteFlow.

---

## 🚀 NPM Scripts

### Development
```bash
# Запуск dev сервера
npm run dev

# Dev сервер запустится на http://localhost:5173
```

### Production
```bash
# Сборка для production
npm run build

# Результат в папке dist/
```

### Preview
```bash
# Предпросмотр production сборки
npm run preview

# Запустится на http://localhost:4173
```

---

## 📦 Управление зависимостями

### Установка
```bash
# Установить все зависимости
npm install

# Установить конкретный пакет
npm install package-name

# Установить dev зависимость
npm install --save-dev package-name

# Установить конкретную версию
npm install package-name@version
```

### Обновление
```bash
# Проверить устаревшие пакеты
npm outdated

# Обновить все пакеты
npm update

# Обновить конкретный пакет
npm update package-name

# Обновить до latest версии (включая major)
npm install package-name@latest
```

### Удаление
```bash
# Удалить пакет
npm uninstall package-name
```

### Очистка
```bash
# Удалить node_modules и lock файл
rm -rf node_modules package-lock.json

# Или на Windows
rmdir /s node_modules
del package-lock.json

# Переустановить
npm install
```

---

## 🔧 TypeScript

### Проверка типов
```bash
# Проверить все TypeScript ошибки
npx tsc --noEmit

# Watch mode
npx tsc --noEmit --watch
```

---

## 🎨 Linting (если настроено)

```bash
# Запустить ESLint
npm run lint

# Автофикс
npm run lint:fix
```

---

## 🧪 Testing (будущее)

```bash
# Запустить тесты
npm test

# Watch mode
npm test:watch

# Coverage
npm test:coverage
```

---

## 📦 Build Анализ

### Bundle Size
```bash
# После build
ls -lh dist/assets/

# Или с visualizer (если установлен)
npm run build
# Откроется stats.html
```

---

## 🐳 Docker

### Build
```bash
# Собрать образ
docker build -t noteflow .

# С тегом версии
docker build -t noteflow:1.0.0 .
```

### Run
```bash
# Запустить контейнер
docker run -p 8080:80 noteflow

# В фоне
docker run -d -p 8080:80 noteflow

# С именем
docker run -d -p 8080:80 --name noteflow-app noteflow
```

### Управление
```bash
# Список контейнеров
docker ps

# Остановить
docker stop noteflow-app

# Удалить
docker rm noteflow-app

# Список образов
docker images

# Удалить образ
docker rmi noteflow
```

### Docker Compose
```bash
# Запустить
docker-compose up

# В фоне
docker-compose up -d

# Остановить
docker-compose down

# Пересобрать
docker-compose up --build
```

---

## 🌐 Git

### Основное
```bash
# Статус
git status

# Добавить все изменения
git add .

# Коммит
git commit -m "feat: Add feature"

# Push
git push

# Pull
git pull
```

### Ветки
```bash
# Список веток
git branch

# Создать новую ветку
git checkout -b feature/my-feature

# Переключиться на ветку
git checkout branch-name

# Удалить ветку
git branch -d branch-name
```

### Работа с remote
```bash
# Список remotes
git remote -v

# Добавить remote
git remote add origin <url>

# Push с установкой upstream
git push -u origin main
```

### История
```bash
# Лог коммитов
git log

# Короткий лог
git log --oneline

# Граф
git log --graph --oneline --all
```

---

## 🚀 Deployment

### Vercel
```bash
# Установить Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Deploy в production
vercel --prod
```

### Netlify
```bash
# Установить Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy

# Deploy в production
netlify deploy --prod
```

### GitHub Pages
```bash
# Deploy
npm run deploy
```

---

## 🔍 Debugging

### Vite
```bash
# Запустить с подробным логом
npm run dev -- --debug

# Очистить кеш Vite
rm -rf node_modules/.vite
npm run dev
```

### Node
```bash
# Проверить версию Node
node --version

# Проверить версию npm
npm --version

# Очистить npm кеш
npm cache clean --force
```

---

## 📱 Горячие клавиши в приложении

### Редактор заметок
- `Enter` - новый блок после текущего
- `Backspace` - удалить пустой блок
- `Ctrl/Cmd + V` - вставить изображение из буфера
- `↑` - к предыдущему блоку
- `↓` - к следующему блоку

### Общие
- `Ctrl/Cmd + S` - сохранить (планируется)
- `Ctrl/Cmd + K` - поиск (планируется)
- `Ctrl/Cmd + N` - новая заметка (планируется)

---

## 🛠️ Утилиты

### Размер папки
```bash
# Linux/Mac
du -sh dist/

# Windows (PowerShell)
(Get-ChildItem dist -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
```

### Найти файлы
```bash
# По имени
find . -name "*.tsx"

# По содержимому
grep -r "searchTerm" .
```

### Копирование
```bash
# Копировать папку
cp -r source/ destination/

# Windows
xcopy source destination /E /I
```

---

## 🔐 Переменные окружения

### Создать .env
```bash
# Копировать пример
cp .env.example .env

# Редактировать
nano .env  # или vim, code
```

### Использование в коде
```typescript
// Доступ к переменным
const apiKey = import.meta.env.VITE_API_KEY;

// Проверка environment
if (import.meta.env.DEV) {
  console.log('Development mode');
}
```

---

## 📊 Мониторинг

### Размер bundle
```bash
# После build
npm run build
ls -lh dist/assets/
```

### Performance
```bash
# Lighthouse (Chrome DevTools)
# F12 → Lighthouse → Generate report

# Или CLI
npm install -g lighthouse
lighthouse http://localhost:5173
```

---

## 🆘 Troubleshooting команды

### Полный reset
```bash
# Удалить все
rm -rf node_modules package-lock.json dist .vite

# Переустановить
npm install

# Запустить
npm run dev
```

### Проблемы с портами
```bash
# Найти процесс на порту (Linux/Mac)
lsof -i :5173

# Убить процесс
kill -9 <PID>

# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

### Ошибки permission
```bash
# Исправить права (Linux/Mac)
sudo chown -R $USER:$USER .

# Или для npm
sudo npm install -g npm
```

---

## 📝 Быстрые команды для разработки

### Утренний старт
```bash
git pull
npm install  # если обновились зависимости
npm run dev
```

### Перед коммитом
```bash
npx tsc --noEmit  # проверить типы
npm run build     # проверить сборку
git add .
git commit -m "feat: Description"
git push
```

### Перед релизом
```bash
npm run build
npm run preview
# Протестировать
# Commit и push
```

---

## 🎯 Полезные ссылки

- [NPM Documentation](https://docs.npmjs.com/)
- [Vite Documentation](https://vitejs.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Git Documentation](https://git-scm.com/doc)

---

## 💡 Pro Tips

### Alias для команд
```bash
# В ~/.bashrc или ~/.zshrc
alias dev="npm run dev"
alias build="npm run build"
alias preview="npm run preview"

# Использование
dev
```

### Watch конфигов
```bash
# Автоперезапуск при изменении config
npm run dev -- --config vite.config.ts
```

### Debug режим
```bash
# Подробный вывод
DEBUG=* npm run dev
```

---

**Быстрого кодинга! 🚀**
