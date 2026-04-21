# React + Vite Frontend Project

This is a Frontend codebase built on the **React** platform using the **Vite** build tool to optimize development speed and performance.

---

## 🚀 Technologies Used

- **React 19**: The most popular UI library.
- **Typescript 6.x**: The standard for type safety and modern JavaScript development.
- **Vite**: A lightning-fast build tool designed to replace Create React App.
- **ESLint**: Ensures code standards and quality.
- **React Router Dom**: Handles client-side routing and navigation.
- **Axios**: Manages API requests and services.

---

## 🛠️ Installation and Usage

Follow these steps to run the project locally:

### 1. Prerequisites

- **Node.js** installed (Version 24.14.x or higher).
- **npm** (Node Package Manager) installed.

### 2. Install Dependencies

Open your terminal in the project's root directory and run:

```bash
npm install
```

### 3. Launch Development Environment

Run the following command to start the development server:

```bash
npm run dev
```

Then, access the application at: http://localhost:5173 (This is the default localhost port).

### 4. Code Quality Check (Linting)

To check for syntax errors and enforce formatting standards, run:

```bash
npm run lint
```

### 5. Build for Production

To bundle the project for deployment to a production server:

```bash
npm run build
```

### Key Project Structure

```bash
attendance-system-frontend/
│
├── src/
│   ├── assets/                 # Static assets: images, icons, fonts, global styles
│   │
│   ├── modules/                # 🔥 CORE BUSINESS DOMAINS (Aligned with BE Modules)
│   │   ├── auth/               # Authentication & Authorization
│   │   │   ├── components/     # Module-specific UI (LoginForm, RegisterForm)
│   │   │   ├── hooks/          # Logic (useAuth, useLogin)
│   │   │   ├── services/       # Auth-specific API calls (login, logout, refresh)
│   │   │   ├── store/          # Module state management (Zustand slice/Redux)
│   │   │   └── types.ts        # Data models (LoginRequest, UserToken, AuthUser)
│   │   │
│   │   ├── recognition/        # 🤖 AI Recognition (Camera, Real-time processing)
│   │   │   ├── components/     # CameraStream, FaceOverlay, ResultCard
│   │   │   ├── hooks/          # useFaceDetection, useRecognitionSocket
│   │   │   └── services/       # Recognition log APIs
│   │   │
│   │   ├── user/               # User Management (Profile, User List)
│   │   ├── meeting/            # Room & Meeting Management
│   │   ├── attendance/         # Attendance Reports & Statistics
│   │   └── notification/       # Notification System (Real-time toasts/alerts)
│   │
│   ├── shared/                 # 🔧 SHARED RESOURCES (Cross-cutting)
│   │   ├── components/         # Reusable UI components
│   │   │   ├── ui/             # Atomic components (Button, Input, Badge)
│   │   │   └── common/         # Composite components (Navbar, Sidebar, Footer)
│   │   ├── hooks/              # Shared hooks (useDebounce, useLocalStorage, useModal)
│   │   ├── utils/              # Helper functions (formatDate, validation, storage)
│   │   ├── constants/          # Constants (enums.ts, messages.ts, routes.ts)
│   │   └── types/              # Global types (Pagination, APIResponse<T>, Theme)
│   │
│   ├── infrastructure/         # 🏗️ TECHNICAL LAYER (External integrations)
│   │   ├── api/                # Axios Configuration (Interceptors, Base URL)
│   │   ├── socket/             # WebSocket/Socket.io client configuration
│   │   └── storage/            # LocalStorage/SessionStorage wrappers
│   │
│   ├── core/                   # ⚙️ SYSTEM CONFIGURATION
│   │   ├── router/             # Routing definition (AppRouter.tsx)
│   │   ├── store/              # Global Store (Root store connecting modules)
│   │   └── providers/          # App Wrappers (AuthProvider, ThemeProvider, QueryClient)
│   │
│   ├── layouts/                # Page wrappers (MainLayout, AuthLayout, DashboardLayout)
│   ├── pages/                  # Route-level components (Assembling modules into screens)
│   │
│   ├── App.tsx                 # Root Component
│   └── main.tsx                # Application Entry Point
│
├── docker/                     # 🐳 DOCKER CONFIGURATION
│   ├── dev.Dockerfile          # Dockerfile for development (Hot reload)
│   ├── prod.Dockerfile         # Dockerfile for production (Build + Nginx)
│   └── nginx.conf              # Nginx config for serving static files & SPA routing
│
├── docs/                       # 📖 PROJECT DOCUMENTATION
│   ├── setup.md                # Installation & environment setup guide
│   ├── architecture.md         # Technical overview & data flow
│   └── api-integration.md      # API & WebSocket event documentation
│
├── public/                     # Static assets not processed by build (favicon, manifest)
├── .env                        # Environment variables (DO NOT PUSH TO GIT)
├── .env.example                # Template for environment variables
├── .gitignore                  # Git ignore rules
├── package.json                # Dependencies & scripts
├── tsconfig.json               # TypeScript configuration
└── README.md                   # Project overview & quick start
```
