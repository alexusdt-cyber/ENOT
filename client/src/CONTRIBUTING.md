# 🤝 Руководство для разработчиков

Спасибо за интерес к проекту NoteFlow! Это руководство поможет вам начать разработку.

## 🎯 Начало работы

### Предварительные требования

- Node.js 18+ или 20+
- npm или yarn
- Git
- Редактор кода (рекомендуется VS Code)

### Локальная установка

1. **Клонировать репозиторий:**
```bash
git clone <repository-url>
cd noteflow
```

2. **Установить зависимости:**
```bash
npm install
```

3. **Запустить dev сервер:**
```bash
npm run dev
```

4. **Открыть в браузере:**
```
http://localhost:5173
```

## 📝 Стандарты кодирования

### TypeScript

- Всегда используйте TypeScript
- Определяйте типы для всех props
- Избегайте `any` типа
- Используйте интерфейсы для объектов

**Пример:**
```typescript
interface NoteEditorProps {
  note: Note;
  onUpdateNote: (note: Note) => void;
  notebooks: Notebook[];
}

export function NoteEditor({ note, onUpdateNote, notebooks }: NoteEditorProps) {
  // ...
}
```

### React компоненты

- Используйте функциональные компоненты
- Hooks вместо классов
- Props деструктуризация
- Named exports для компонентов

**Пример:**
```typescript
// ✅ Правильно
export function MyComponent({ prop1, prop2 }: MyComponentProps) {
  const [state, setState] = useState();
  return <div>...</div>;
}

// ❌ Неправильно
export default class MyComponent extends React.Component {
  // ...
}
```

### Именование

- **Компоненты:** PascalCase (`NoteEditor`, `TaskManager`)
- **Функции:** camelCase (`handleClick`, `updateNote`)
- **Константы:** UPPER_SNAKE_CASE (`MAX_FILE_SIZE`)
- **Файлы компонентов:** PascalCase (`NoteEditor.tsx`)
- **Утилиты:** camelCase (`clipboard.ts`)

### Импорты

Порядок импортов:
```typescript
// 1. React
import { useState, useEffect } from 'react';

// 2. Сторонние библиотеки
import { ChevronDown } from 'lucide-react';

// 3. Локальные компоненты
import { Button } from './components/ui/button';
import { NoteEditor } from './components/NoteEditor';

// 4. Типы
import type { Note, Block } from './types';

// 5. Стили (если есть)
import './styles.css';
```

## 🎨 Стилизация

### Tailwind CSS

- Используйте Tailwind классы вместо custom CSS
- Избегайте inline styles
- **НЕ используйте** классы для font-size, font-weight, line-height (есть defaults в globals.css)

**Пример:**
```typescript
// ✅ Правильно
<div className="p-4 rounded-lg bg-white/60 backdrop-blur-sm">

// ❌ Неправильно (если не требуется специально)
<div className="p-4 rounded-lg bg-white/60 backdrop-blur-sm text-2xl font-bold">
```

### Glass Morphism стиль

Используйте эти паттерны для поддержания единообразия:

```typescript
// Карточка с glass эффектом
className="bg-white/60 backdrop-blur-sm border border-white/40"

// Hover эффект
className="hover:bg-white/80 transition-colors"

// Градиентный фон
className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50"

// Градиентный текст
className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent"
```

## 🧩 Добавление новых функций

### 1. Новый тип блока в редакторе

**Пример: добавление блока "Quote"**

1. Обновить тип `Block` в `/App.tsx`:
```typescript
type: "text" | "code" | "tasklist" | "image" | "quote" // добавить "quote"
```

2. Создать компонент `QuoteBlock.tsx`:
```typescript
import { useState } from 'react';

interface QuoteBlockProps {
  content: string;
  onUpdate: (content: string) => void;
}

export function QuoteBlock({ content, onUpdate }: QuoteBlockProps) {
  return (
    <blockquote className="border-l-4 border-indigo-500 pl-4 italic">
      <textarea
        value={content}
        onChange={(e) => onUpdate(e.target.value)}
        className="w-full bg-transparent"
      />
    </blockquote>
  );
}
```

3. Добавить в `BlockEditor.tsx`:
```typescript
{block.type === 'quote' && (
  <QuoteBlock 
    content={block.content}
    onUpdate={(content) => handleUpdateBlock({ ...block, content })}
  />
)}
```

4. Добавить кнопку в меню блоков:
```typescript
<button onClick={() => addBlock('quote')}>
  Quote
</button>
```

### 2. Новый раздел в приложении

**Пример: добавление раздела "Calendar"**

1. Обновить тип `activeView` в `/App.tsx`:
```typescript
type View = "notes" | "tasks" | "goals" | "files" | "roadmap" | "calendar";
```

2. Создать компонент `Calendar.tsx`:
```typescript
export function Calendar() {
  return (
    <div className="flex-1 p-6">
      {/* Календарь UI */}
    </div>
  );
}
```

3. Добавить в `Sidebar.tsx`:
```typescript
<button 
  onClick={() => onViewChange('calendar')}
  className={activeView === 'calendar' ? 'active' : ''}
>
  <CalendarIcon />
  Calendar
</button>
```

4. Добавить в `App.tsx`:
```typescript
{activeView === 'calendar' && <Calendar />}
```

## 🔧 Работа с состоянием

### Добавление нового состояния

Всегда добавляйте состояние в `App.tsx` и передавайте через props:

```typescript
// В App.tsx
const [newState, setNewState] = useState<Type>(initialValue);

const handleUpdate = (data: Type) => {
  setNewState(data);
};

// Передать в компонент
<Component 
  data={newState} 
  onUpdate={handleUpdate}
/>
```

### Будущее: Context API

Для глобального состояния рекомендуется использовать Context:

```typescript
// contexts/AppContext.tsx
const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }) {
  const [notes, setNotes] = useState<Note[]>([]);
  
  return (
    <AppContext.Provider value={{ notes, setNotes }}>
      {children}
    </AppContext.Provider>
  );
}

// Использование
const { notes, setNotes } = useContext(AppContext);
```

## 🧪 Тестирование

### Перед коммитом

1. **Проверить TypeScript:**
```bash
npx tsc --noEmit
```

2. **Проверить сборку:**
```bash
npm run build
```

3. **Проверить приложение:**
- Создать заметку
- Добавить блоки разных типов
- Проверить все разделы
- Проверить адаптивность

### Будущее: Автоматические тесты

Планируется добавить:
- Jest для unit тестов
- React Testing Library для компонентов
- Cypress для E2E тестов

## 📦 Работа с зависимостями

### Добавление новой зависимости

1. **Установить:**
```bash
npm install package-name
```

2. **Проверить размер bundle:**
```bash
npm run build
# Проверить размер в dist/
```

3. **Обновить README** если нужно

### Обновление зависимостей

```bash
# Проверить устаревшие
npm outdated

# Обновить
npm update

# Для major версий
npm install package@latest
```

## 🐛 Debugging

### VS Code настройки

Создайте `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Launch Chrome",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}"
    }
  ]
}
```

### React DevTools

Установите расширение React Developer Tools для Chrome/Firefox.

### Vite HMR

Если HMR не работает:
```bash
# Перезапустить сервер
npm run dev
```

## 📊 Performance

### Оптимизация компонентов

Используйте React.memo для тяжелых компонентов:

```typescript
import { memo } from 'react';

export const NoteItem = memo(function NoteItem({ note }) {
  return <div>...</div>;
});
```

### useMemo для вычислений

```typescript
const sortedNotes = useMemo(() => {
  return notes.sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}, [notes]);
```

### useCallback для функций

```typescript
const handleClick = useCallback(() => {
  // ...
}, [dependencies]);
```

## 🔀 Git Workflow

### Создание нового feature

1. **Создать ветку:**
```bash
git checkout -b feature/my-new-feature
```

2. **Разработка:**
```bash
# Регулярные коммиты
git add .
git commit -m "feat: Add new feature"
```

3. **Перед push:**
```bash
# Обновить с main
git checkout main
git pull
git checkout feature/my-new-feature
git rebase main

# Проверить
npm run build
npm run dev

# Push
git push origin feature/my-new-feature
```

### Commit messages

Используйте Conventional Commits:

```
feat: Add calendar view
fix: Fix note deletion bug
refactor: Improve note editor performance
style: Update button styles
docs: Update README
test: Add note editor tests
chore: Update dependencies
```

## 📝 Документация

### Документирование компонентов

Добавляйте JSDoc комментарии:

```typescript
/**
 * Note editor component with block-based editing
 * 
 * @param note - The note to edit
 * @param onUpdateNote - Callback when note is updated
 * @param notebooks - Available notebooks
 */
export function NoteEditor({ note, onUpdateNote, notebooks }: NoteEditorProps) {
  // ...
}
```

### Обновление документации

При добавлении новых функций обновите:
- README.md - основная информация
- ARCHITECTURE.md - архитектурные решения
- CONTRIBUTING.md - инструкции для разработчиков

## 🚀 Deployment

### Production build

```bash
npm run build
```

Файлы будут в папке `dist/`.

### Проверка production сборки

```bash
npm run preview
```

## 💡 Best Practices

### 1. DRY (Don't Repeat Yourself)
Выносите повторяющийся код в функции/компоненты.

### 2. Single Responsibility
Один компонент = одна ответственность.

### 3. Prop Drilling
Если props передаются через 3+ уровня, используйте Context.

### 4. Error Handling
Всегда обрабатывайте ошибки:

```typescript
try {
  await someAsyncOperation();
} catch (error) {
  console.error('Error:', error);
  // Показать уведомление пользователю
}
```

### 5. Loading States
Показывайте состояние загрузки:

```typescript
const [loading, setLoading] = useState(false);

if (loading) return <Spinner />;
```

### 6. Empty States
Обрабатывайте пустые состояния:

```typescript
if (notes.length === 0) {
  return <EmptyState message="No notes yet" />;
}
```

## 🆘 Помощь

### Вопросы и проблемы

- Создавайте Issues в GitHub
- Проверьте существующие Issues
- Детально описывайте проблему

### Связь с командой

- GitHub Discussions
- Discord (если есть)
- Email

## ✅ Checklist перед PR

- [ ] Код соответствует стандартам
- [ ] TypeScript без ошибок
- [ ] Build успешен
- [ ] Приложение работает
- [ ] Документация обновлена
- [ ] Commit messages правильные
- [ ] Нет console.log в коде
- [ ] Адаптивность проверена

## 🎉 Спасибо!

Ваш вклад делает NoteFlow лучше! 💙

---

**Happy Coding! 🚀**
