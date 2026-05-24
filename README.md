# DevPulse

A collaborative platform for software teams to report bugs and suggest features.

**Live URL:** https://devpulse-api.vercel.app

**GitHub:** https://github.com/yourusername/devpulse

---

## Tech Stack

- Node.js, TypeScript, Express.js
- PostgreSQL (native `pg` driver, raw SQL only)
- bcrypt, jsonwebtoken

---

## Features

- JWT authentication with role-based access (contributor / maintainer)
- Create, read, update, delete issues
- Filter issues by type and status, sort by date

---

## Folder Structure

```
src/
├── config/
│   └── index.ts
├── db/
│   └── index.ts
├── middleware/
│   ├── auth.ts
│   ├── globalErrorHandler.ts
│   ├── index.d.ts
│   └── logger.ts
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.interface.ts
│   │   ├── auth.route.ts
│   │   └── auth.service.ts
│   └── issues/
│       ├── issues.controller.ts
│       ├── issues.interface.ts
│       ├── issues.route.ts
│       └── issues.service.ts
├── types/
│   └── index.ts
├── utility/
│   └── sendResponse.ts
├── app.ts
└── server.ts
```

---



## API Endpoints

| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/auth/signup` | Public |
| POST | `/api/auth/login` | Public |
| POST | `/api/issues` | Authenticated |
| GET | `/api/issues` | Public |
| GET | `/api/issues/:id` | Public |
| PATCH | `/api/issues/:id` | Authenticated |
| DELETE | `/api/issues/:id` | Maintainer only |

---

## Database Schema

**users:** `id`, `name`, `email`, `password`, `role`, `created_at`, `updated_at`

**issues:** `id`, `title`, `description`, `type`, `status`, `reporter_id`, `created_at`, `updated_at`