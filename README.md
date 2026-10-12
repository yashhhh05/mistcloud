# ☁️ Mist Cloud (React + Express)

A modern cloud storage solution built with separated **React (Vite + Tailwind CSS)** on the frontend and **Express (Node.js)** on the backend.

---

## 🏛️ Architecture

```
├── frontend/             # React SPA (Vite, React Router, Tailwind CSS)
│   ├── src/
│   │   ├── api/          # Axios HTTP clients for Express REST endpoints
│   │   ├── components/   # UI components (Header, Sidebar, Card, Uploader, etc.)
│   │   ├── context/      # AuthContext for session management
│   │   ├── pages/        # Dashboard, FilesView, SignIn, SignUp
│   │   ├── types/        # TypeScript interfaces
│   │   └── utils/        # Formatting and helper utilities
│   └── vite.config.ts
│
├── backend/              # Express REST API (Node.js)
│   ├── config/           # Database, S3, in-memory store
│   ├── controllers/      # Auth, File, Search controllers
│   ├── middleware/       # JWT Auth, Multer upload, Error handling
│   ├── models/           # Mongoose schemas (User, File)
│   ├── routes/           # Express routers (/api/auth, /api/files, /api/search)
│   └── services/         # Storage and mail services
│
└── server.js             # Unified full-stack server serving API & React SPA on port 3000
```

---

## 🚀 Getting Started

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

---

## 🔑 Features

- **Authentication**: JWT authentication with passwordless 6-digit OTP verification and quick demo login.
- **Storage Management**: Visual usage breakdown across Documents, Images, Media, and Others.
- **File Operations**: Upload (with drag & drop and live progress), rename, share, delete, and download.
- **Global Search**: Debounced search across file names and metadata.
- **Resilient Fallback**: Automatic in-memory store for instant zero-config evaluation.
