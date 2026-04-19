npm create vite@latest my-app -- --template react-ts cd my-app npm install -D tailwindcss postcss autoprefixer 
npm install @tailwindcss/postcss

create tailwind.config.js at the root folder
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

create potcss.config.js at the root folder
export default {
  plugins: {
    "@tailwindcss/postcss": {},
    autoprefixer: {},
  },
}

add 
@tailwind base;
@tailwind components;
@tailwind utilities;
in the index.css


src/
├── assets/
│   ├── images/
│   ├── icons/
│   └── fonts/
│
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   └── Loader.tsx
│   │
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   └── Footer.tsx
│   │
│   └── common/
│       ├── ProtectedRoute.tsx
│       └── ErrorBoundary.tsx
│
├── pages/
│   ├── auth/
│   │   ├── Login.tsx
│   │   └── Register.tsx
│   │
│   ├── dashboard/
│   │   ├── Dashboard.tsx
│   │   └── DashboardLayout.tsx
│   │
│   └── NotFound.tsx
│
├── features/
│   ├── user/
│   │   ├── user.api.ts
│   │   ├── user.slice.ts
│   │   └── user.types.ts
│   │
│   └── auth/
│       ├── auth.api.ts
│       ├── auth.slice.ts
│       └── auth.types.ts
│
├── hooks/
│   ├── useAuth.ts
│   ├── useDebounce.ts
│   └── useTheme.ts
│
├── lib/
│   ├── axios.ts
│   ├── queryClient.ts
│   └── storage.ts
│
├── routes/
│   └── AppRoutes.tsx
│
├── store/
│   ├── index.ts
│   └── rootReducer.ts
│
├── styles/
│   ├── globals.css
│   └── tailwind.css
│
├── types/
│   └── index.d.ts
│
├── utils/
│   ├── constants.ts
│   ├── formatters.ts
│   └── validators.ts
│
├── App.tsx
├── main.tsx
└── env.d.ts
