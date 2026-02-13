# NoteFlow - Premium Note Taking Application

## Overview

NoteFlow is a full-stack note-taking application with a modern glass morphism design. It features a React frontend with TypeScript, an Express.js backend, and MySQL database integration via Drizzle ORM. The application supports multi-method authentication (email/password, Google OAuth, Telegram), rich-text note editing with support for large content, categories, sharing permissions, and file attachments.

**Последнее обновление:** 6 февраля 2026
- ✅ MySQL база данных подключена и инициализирована
- ✅ Создана профессиональная схема БД (6 таблиц)
- ✅ Реализована multi-auth авторизация (Email, Google OAuth, Telegram)
- ✅ 25 API endpoints для полного CRUD
- ✅ Система совместного доступа к заметкам
- ✅ Поддержка LONGTEXT для больших блокнотов
- ✅ Telegram Widget авторизация с проверкой подписи
- ✅ Парсинг таблиц из Evernote при вставке контента
- ✅ Распознавание кодовых блоков Evernote (data-codeblock="true")
- ✅ Кнопка "Выделить все блоки" для мультивыделения с удалением по Delete
- ✅ Полная мобильная адаптация всех секций (block-based navigation)
- ✅ Mini Apps SSO интеграция (postMessage-based JWT tickets)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with hot module replacement
- **Styling**: Tailwind CSS v4 with glass morphism effects
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **State Management**: React hooks and context (AppContext for global state)
- **Data Fetching**: TanStack React Query

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with tsx for development
- **API Pattern**: RESTful endpoints under `/api/` prefix
- **Session Management**: express-session with configurable session store
- **Authentication**: Passport.js with Local, Google OAuth, and Telegram strategies
- **Password Security**: bcryptjs for hashing

### Database Layer
- **ORM**: Drizzle ORM
- **Database**: MySQL (configured via `DATABASE_URL` environment variable)
- **Schema Location**: `shared/schema.ts` - defines users, categories, notes, noteShares, and attachments tables
- **Migrations**: SQL-based migrations in `/migrations` directory

### Project Structure
```
├── client/              # Frontend React application
│   ├── src/
│   │   ├── components/  # React components (UI, features)
│   │   ├── contexts/    # React context providers
│   │   ├── styles/      # Global CSS and Tailwind config
│   │   └── types/       # TypeScript type definitions
│   └── index.html       # Entry HTML
├── server/              # Backend Express application
│   ├── auth.ts          # Passport authentication strategies
│   ├── db.ts            # Database connection
│   ├── routes.ts        # API route definitions
│   ├── storage.ts       # Data access layer
│   └── index.ts         # Server entry point
├── shared/              # Shared code between client/server
│   └── schema.ts        # Drizzle database schema
└── migrations/          # Database migration files
```

### Key Design Patterns
- **Block-based Editor**: Notes use a modular block system supporting text, code, tasks, images, tables, and lists
- **Multi-tenant**: Users have isolated data with category and note ownership
- **Share Tokens**: Notes can be shared via generated tokens for public access
- **Responsive Design**: Mobile-first approach with sidebar navigation

## External Dependencies

### Database
- **MySQL**: Primary database, connected via `mysql2` driver
- **Connection**: Uses connection pooling via `DATABASE_URL` environment variable

### Authentication Services
- **Google OAuth 2.0**: Requires `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_CALLBACK_URL`
- **Telegram Login**: Infrastructure ready, requires bot token configuration

### Required Environment Variables
- `DATABASE_URL` - MySQL connection string (required)
- `SESSION_SECRET` - Secret for session encryption (required, min 32 chars)
- `GOOGLE_CLIENT_ID` - Google OAuth client ID (optional)
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret (optional)
- `GOOGLE_CALLBACK_URL` - OAuth callback URL (defaults to localhost)

### Key NPM Packages
- **UI**: @radix-ui components, lucide-react icons, class-variance-authority
- **Forms**: react-hook-form with zod validation
- **Drag & Drop**: react-dnd with HTML5 backend
- **Date Handling**: date-fns
- **Database**: drizzle-orm, mysql2, drizzle-zod
- **SSO**: jsonwebtoken for Mini Apps JWT tickets

## Mini Apps SSO Integration

**Added:** 5 February 2026

NoteFlow supports external Mini Apps integration via postMessage-based SSO flow.

### Architecture

- **Session Management**: Server creates session with unique nonce and stores app origin
- **JWT Tickets**: One-time use tickets with 60s TTL, validated via introspect endpoint
- **Origin Validation**: Session origin is verified against app's allowedPostMessageOrigins

### API Endpoints

- `POST /api/miniapp/session/start` - Start iframe session, returns sessionNonce and origin
- `POST /api/sso/ticket` - Exchange sessionNonce for JWT ticket (requires valid session)
- `POST /api/sso/introspect` - Validate ticket and return user profile (one-time use)
- `POST /api/miniapp/demo/init` - Create demo Mini App for testing

### Database Tables

- `miniapp_sessions` - Stores active iframe sessions (userId, appId, sessionNonce, appOrigin, expiresAt)
- `sso_tickets` - Tracks issued JWT tickets (jti, used flag, expiresAt)

### App Schema Extensions

Apps with `launchMode: "iframe"` support:
- `origin` - Primary app origin (e.g., https://app.example.com)
- `allowedOrigins` - List of allowed origins for launchUrl
- `allowedPostMessageOrigins` - Origins allowed for postMessage communication
- `allowedStartUrlPatterns` - URL patterns for valid start URLs
- `scopes` - Requested permissions (profile, email)
- `ssoMode` - Authentication mode ("postmessage" for iframe SSO)
- `status` - App status (active, suspended, etc.)

### postMessage Protocol

1. Parent opens iframe with Mini App
2. Mini App sends `EMBED_READY` with sessionNonce
3. Parent requests ticket via `/api/sso/ticket`
4. Parent sends `SSO_TICKET` to iframe with JWT
5. Mini App validates ticket via `/api/sso/introspect`

### Files

- `server/modules/miniapp-sso/` - SSO service and routes
- `client/src/components/apps/MiniAppModal.tsx` - Iframe modal component
- `client/public/demo-miniapp/index.html` - Demo Mini App for testing