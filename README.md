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
frontend/
├── src
│   ├── assets/             # Static assets: images, icons, fonts, global styles
│   │
│   ├── modules/            # Business domains (aligned with Backend modules)
│   │   ├── auth/           # Authentication UI & logic
│   │   ├── user/           # User management UI
│   │   ├── recognition/    # Recognition display & processing flow
│   │   ├── meeting/        # Meeting management UI
│   │   ├── attendance/     # Attendance handling UI
│   │   └── notification/   # Notification system (toast, realtime)
│   │
│   │   └── user/
│   │       ├── components/ # Module-specific UI components
│   │       ├── hooks/      # Module-specific logic (custom hooks)
│   │       ├── services/   # Module-specific API calls
│   │       └── types.ts    # Data models and types
│   │
│   ├── components/         # Global reusable UI components (Button, Modal, Table)
│   │
│   ├── layouts/            # Layouts (MainLayout, AuthLayout, AdminLayout)
│   │
│   ├── pages/              # Compose modules into full screens (routing level)
│   │
│   ├── services/           # Global API layer (Axios instance, interceptors)
│   │
│   ├── hooks/              # Shared hooks (useAuth, useDebounce, etc.)
│   │
│   ├── config/             # Environment variables, constants, app configuration
│   │
│   ├── types/              # Global TypeScript types/interfaces
│   │
│   ├── utils/              # Utility/helper functions (formatting, validation)
│   │
│   ├── main.tsx            # Application entry point
│   └── App.tsx             # Root component
│
├── public/                 # Static public assets
├── .env                    # Environment configuration
└── README.md               # Project documentation
```
