# DevByte Community API (Backend)

The **DevByte API** is the backend service powering the DevByte Community Website.  
It provides secure endpoints for user management, content delivery, and community interactions.  
Built with **Node.js** and **PostgreSQL**, it follows modern backend best practices.

---

## 🚀 Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL
- **ORM/Query Builder:** Sequelize
- **Testing:** Jest (+ Supertest for integration)
- **API Style:** REST

---

## 📂 Project Structure

```bash
community-api-backend/
├── src/
│   ├── app.js             # Express app setup
│   ├── server.js          # Server entry point
│   ├── routes/            # API route definitions
│   │   └── index.js       # Main router entry
│   ├── controllers/       # Request handlers (business logic entry)
│   ├── services/          # Core business logic layer
│   ├── models/            # Database models (MVP: placeholders)
│   ├── middleware/        # Custom middlewares
│   └── utils/             # Helper functions
├── tests/                 # Unit and integration tests
├── .env                   # Local environment variables (not committed)
├── .env.example           # Example environment variables
├── nodemon.json           # Dev server config
└── package.json

```

---

## ⚙️ Setup & Installation

### 1. Clone the repository

```bash
git clone https://github.com/DevByte-Community/community-api-backend.git
cd community-api-backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a .env file in the project root based on .env.example.

## Example:

```bash
env
APP_PORT=8000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/devbyte
JWT_SECRET=your_secret_key
```

### 4. Run database migrations (if using ORM)

```bash
npx prisma migrate dev   # Example for Prisma
```

### 5. Start the server (development - with nodemon)

```bash
npm run start:dev
```

### 6. Start the server (production)

```bash
npm run start:prod
```

## 📡 API Endpoints (Planned)

Method Endpoint Description
POST /api/v1/auth/signup Register a new user
POST /api/v1/auth/login Authenticate user & token
GET /api/v1/users List all users (admin)
GET /api/v1/posts Fetch community posts

(More endpoints will be added as the design is finalized.)

## 🧪 Testing

Run tests locally:

```bash
npm test
```

## 🤝 Contributing

Please read our [CONTRIBUTING](./CONTRIBUTING.md) Guidelines before submitting pull requests.
All contributions are welcome — from bug fixes to major feature proposals.

## 📜 License

This project is licensed under the MIT [LICENSE](./LICENSE.md).
