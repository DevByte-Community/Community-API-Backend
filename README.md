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

## 💅 Code Style & Linting

We use ESLint and Prettier to maintain consistent code style and catch potential issues. The configuration is already set up and includes:

- ESLint with recommended rules for Node.js
- Prettier for consistent code formatting
- Pre-commit hooks to ensure code quality

### Available Scripts

```bash
# Check code for style and potential issues
npm run lint

# Automatically fix ESLint issues
npm run lint:fix

# Format code with Prettier
npm run format
```

### Pre-commit Hooks

The project uses Husky and lint-staged to run checks before each commit:

1. Linting and formatting on staged files
2. Running all tests

This ensures that all committed code meets our quality standards. If you need to bypass these checks in an emergency (not recommended), you can use:

```bash
git commit --no-verify
```

### Code Style Decisions

We've made specific code style choices to ensure consistency and maintainability across the project:

#### JavaScript Standards

- Uses modern ES2021+ features
- Enforces const declarations when variables aren't reassigned
- Prohibits use of var (use let or const instead)
- Requires explicit error handling (no process.exit calls)

#### Formatting Rules (Prettier)

- Line length: Maximum 100 characters
- Quotes: Single quotes for strings
- Semicolons: Required at end of statements
- Indentation: 2 spaces
- Trailing commas: ES5 style (for cleaner git diffs)
- Line endings: LF (Unix-style)

#### Error Prevention (ESLint)

- Unused variables must be prefixed with underscore (e.g., `_unused`)
- Console usage is restricted to `console.log` and `console.error`
- Node.js and Jest environments are preconfigured
- Integrates with Prettier to avoid conflicts

### Configuration Files

- `.eslintrc.json` - ESLint rules configuration
- `.prettierrc.json` - Prettier formatting options
- `.husky/pre-commit` - Pre-commit hook configuration
- `package.json` - Contains lint-staged configuration

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
