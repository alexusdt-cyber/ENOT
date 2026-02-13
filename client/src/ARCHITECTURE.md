# 🏗️ Архитектура NoteFlow

## Обзор

NoteFlow построен на современном React стеке с использованием TypeScript, Vite и Tailwind CSS v4.

## 📁 Структура компонентов

### Главные компоненты

```
App.tsx (корневой компонент)
├── Header (навигация и поиск)
├── Sidebar (боковое меню)
├── NoteList (список заметок) или TaskManager или FileManager или RoadMapList
└── NoteEditor (редактор) или GoalsDesk или RoadMapEditor
```

### Компонентная иерархия

#### 1. **App.tsx**
- Главный компонент приложения
- Управляет глобальным состоянием (notes, tasks, goals, roadmaps, files)
- Роутинг между разделами (notes, tasks, goals, files, roadmap)
- Обработчики событий для всех операций CRUD

**Состояние:**
```typescript
- activeView: "notes" | "tasks" | "goals" | "files" | "roadmap"
- selectedNote: Note | null
- selectedRoadMap: RoadMap | null
- searchQuery: string
- notebooks: Notebook[]
- notes: Note[]
- tasks: Task[]
- goals: Goal[]
- roadmaps: RoadMap[]
- folders: FolderItem[]
- fileItems: FileItem[]
```

#### 2. **Sidebar.tsx**
- Навигация между разделами
- Кнопка создания новой заметки
- Список блокнотов с категориями

#### 3. **NoteList.tsx**
- Отображение списка заметок
- Фильтрация по блокнотам
- Поиск по заметкам
- Закрепление заметок (pinned)
- Удаление заметок

#### 4. **NoteEditor.tsx**
- Редактирование заголовка заметки
- Управление блоками (добавление, удаление, редактирование)
- Смена блокнота
- Использует BlockEditor для каждого блока

**Типы блоков:**
- `text` - текстовый блок
- `code` - блок с кодом и подсветкой синтаксиса
- `tasklist` - список задач с чекбоксами
- `image` - изображение с изменением размера
- `bulletlist` - маркированный список
- `orderedlist` - нумерованный список
- `table` - таблица с редактируемой структурой

#### 5. **BlockEditor.tsx**
- Универсальный редактор для всех типов блоков
- Обработка вставки изображений (Ctrl+V)
- Навигация курсором между блоками
- Создание новых блоков на Enter

#### 6. **TaskManager.tsx**
- Отображение задач с приоритетами
- Фильтрация (все, активные, завершенные)
- Сортировка по приоритету
- Создание и удаление задач

#### 7. **GoalsDesk.tsx**
- Визуальная доска целей (карточки с изображениями)
- Drag & Drop для изменения порядка (React DnD)
- Модальное окно для добавления целей
- Отметка выполненных целей

#### 8. **RoadMapList.tsx**
- Список roadmaps с фильтрацией
- Закрепление roadmaps
- Создание и удаление

#### 9. **RoadMapEditor.tsx**
- Редактирование roadmap
- Добавление/удаление вех (milestones)
- Временная линия (timeline) с вертикальной линией
- **Идеальное центрирование чекпоинтов:**
  - Timeline линия: `left-8` (32px)
  - Padding контейнера: `pl-20` (80px)
  - Сдвиг чекпоинтов: `-left-[68px]`
  - Результат: линия точно по центру всех чекпоинтов

#### 10. **FileManager.tsx**
- Управление папками и файлами
- Загрузка файлов (drag & drop или выбор)
- Предпросмотр изображений
- Переименование и удаление

### Вспомогательные компоненты

- **CodeBlock.tsx** - блок кода с подсветкой синтаксиса (PrismJS)
- **TableBlock.tsx** - редактируемая таблица
- **RichTextEditor.tsx** - расширенный текстовый редактор
- **TaskItem.tsx** - отдельная задача с чекбоксом
- **Tooltip.tsx** - всплывающие подсказки

### UI компоненты (Shadcn)

Находятся в `/components/ui/`:
- Button, Input, Textarea
- Dialog, Dropdown Menu, Popover
- Card, Badge, Avatar
- Checkbox, Switch, Slider
- и другие...

## 📊 Модель данных

### Note (Заметка)
```typescript
interface Note {
  id: string;
  title: string;
  blocks: Block[];
  notebook: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  pinned?: boolean;
}
```

### Block (Блок)
```typescript
interface Block {
  id: string;
  type: "text" | "code" | "tasklist" | "image" | "bulletlist" | "orderedlist" | "table";
  content: string;
  metadata?: {
    language?: string; // для code
    tasks?: Task[]; // для tasklist
    width?: number; // для image
    height?: number; // для image
    images?: string[]; // для gallery
    alignment?: "left" | "center" | "right"; // для image
    tableData?: {
      rows: number;
      cols: number;
      cells: { [key: string]: string };
    };
  };
}
```

### Task (Задача)
```typescript
interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: Date;
  priority: "low" | "medium" | "high";
}
```

### Goal (Цель)
```typescript
interface Goal {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  price?: number;
  completed: boolean;
  createdAt: Date;
}
```

### RoadMap
```typescript
interface RoadMap {
  id: string;
  title: string;
  notebook: string;
  milestones: Milestone[];
  createdAt: Date;
  updatedAt: Date;
  targetDate?: Date;
  pinned?: boolean;
}

interface Milestone {
  id: string;
  year: string;
  title: string;
  description: string;
  completed: boolean;
  date: Date;
}
```

### Notebook (Блокнот)
```typescript
interface Notebook {
  id: string;
  name: string;
  color: string;
  category?: "work" | "personal" | "study" | "other";
}
```

### FileItem & FolderItem
```typescript
interface FileItem {
  id: string;
  name: string;
  type: "file";
  size: number;
  folderId: string;
  fileType: "document" | "image" | "video" | "audio" | "code" | "archive" | "other";
  uploadedAt: Date;
  url?: string;
}

interface FolderItem {
  id: string;
  name: string;
  type: "folder";
  color: string;
  filesCount: number;
  size: number;
  createdAt: Date;
}
```

## 🎨 Стилизация

### Tailwind CSS v4

Используем новую версию Tailwind CSS с CSS-first конфигурацией.

**Файл стилей:** `/styles/globals.css`

### Glass Morphism эффекты

```css
.glass-effect {
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}
```

### Градиенты

Основная палитра: indigo → purple → pink

```typescript
bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50
bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600
```

### CSS переменные

Определены в `globals.css` для консистентности дизайна.

## 🔄 Поток данных

### Однонаправленный поток

```
App.tsx (состояние)
  ↓
Props ↓
  ↓
Child Components
  ↓
Events ↑
  ↓
Event Handlers в App.tsx
  ↓
setState
  ↓
Re-render
```

### Паттерн управления состоянием

Используем **Lifting State Up**:
- Вся логика состояния в App.tsx
- Дочерние компоненты получают данные через props
- Изменения через callback функции

**Пример:**
```typescript
// В App.tsx
const [notes, setNotes] = useState<Note[]>([]);

const handleUpdateNote = (updatedNote: Note) => {
  setNotes(notes.map(note => 
    note.id === updatedNote.id ? updatedNote : note
  ));
};

// В NoteEditor
<NoteEditor 
  note={selectedNote} 
  onUpdateNote={handleUpdateNote}
/>
```

## 🧩 Ключевые паттерны

### 1. Controlled Components
Все формы и input используют controlled components:
```typescript
<input 
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>
```

### 2. Composition
Компоненты строятся из более мелких компонентов:
```typescript
<NoteEditor>
  <BlockEditor>
    <CodeBlock />
    <TableBlock />
  </BlockEditor>
</NoteEditor>
```

### 3. Render Props / Children
```typescript
<Dialog>
  {children}
</Dialog>
```

### 4. Custom Hooks
Для переиспользуемой логики (в будущем):
```typescript
const useLocalStorage = (key, initialValue) => { ... }
```

## 🔧 Утилиты

### clipboard.ts
Обработка вставки изображений из буфера обмена:
```typescript
export const handlePaste = async (e: ClipboardEvent) => {
  // Извлечение изображений из clipboard
  // Конвертация в Data URL
  // Возврат строки изображения
}
```

## 🚀 Производительность

### Оптимизации

1. **Lazy Loading** - компоненты загружаются по требованию
2. **Мemoization** - использование React.memo для тяжелых компонентов
3. **Virtual Scrolling** - для длинных списков (будущее улучшение)
4. **Code Splitting** - через динамические импорты

### Рекомендации для дальнейшего развития

1. Добавить `React.memo` для:
   - NoteList items
   - Task items
   - Goal cards

2. Использовать `useMemo` для:
   - Фильтрации заметок
   - Сортировки списков
   - Вычисляемых значений

3. Добавить `useCallback` для:
   - Event handlers передаваемых в дочерние компоненты

## 🔐 Безопасность

### Текущее состояние
- Нет аутентификации
- Данные хранятся в памяти (теряются при перезагрузке)

### Рекомендации для production

1. **Аутентификация:**
   - JWT токены
   - OAuth (Google, GitHub)
   - Session management

2. **Backend:**
   - Supabase для хранения данных
   - API endpoints с валидацией
   - Rate limiting

3. **Безопасность данных:**
   - XSS защита (React автоматически)
   - CSRF токены
   - Content Security Policy

## 📱 Адаптивность

Приложение адаптировано для:
- Desktop (основной фокус)
- Tablet (частично)
- Mobile (требует улучшений)

### Breakpoints
```css
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

## 🧪 Тестирование

### Будущие улучшения

1. **Unit тесты:**
   - Утилитарные функции
   - Хуки
   - Компоненты

2. **Integration тесты:**
   - Потоки пользователя
   - CRUD операции

3. **E2E тесты:**
   - Критические пути
   - Cypress или Playwright

## 🔄 Git Workflow

### Рекомендуемая структура коммитов

```
feat: Add new feature
fix: Bug fix
refactor: Code refactoring
style: Styling changes
docs: Documentation
test: Testing
chore: Maintenance
```

## 📈 Метрики качества кода

Рекомендуется отслеживать:
- Bundle size (Vite bundle analyzer)
- Lighthouse score
- TypeScript coverage
- Lint errors/warnings

---

**Архитектура готова для масштабирования и дальнейшего развития! 🚀**
