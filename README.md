# DevByte Community API (Backend)

The **DevByte API** is the backend service powering the DevByte Community Website.  
It provides secure endpoints for user management, content delivery, and community interactions.  
Built with **Node.js** and **PostgreSQL**, it follows modern backend best practices.

---

## 🚀 Tech Stack
- **Runtime:** Node.js
- **Framework:** Express.js 
- **Database:** PostgreSQL
- **ORM/Query Builder:** (e.g., Prisma, Sequelize, or Knex – update once chosen)
- **Testing:** Jest / Supertest (to be defined)
- **API Style:** REST (GraphQL if planned later)

---

## 📂 Project Structure
community-api/
├── src/
│ ├── routes/ # API route definitions
│ ├── controllers/ # Business logic
│ ├── models/ # Database models
│ ├── middleware/ # Custom middlewares
│ └── utils/ # Helper functions
├── tests/ # Unit and integration tests
├── .env.example # Example environment variables
└── package.json

yaml
---

## ⚙️ Setup & Installation

### 1. Clone the repository
```bash
git clone https://github.com/DevByte-Community/community-api-backend.git
cd community-api
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
DATABASE_URL=postgresql://user:password@localhost:5432/devbyte
PORT=4000
JWT_SECRET=your_secret_key
```
### 4. Run database migrations (if using ORM)
```bash
npx prisma migrate dev   # Example for Prisma
```
### 5. Start the server
```bash
npm run dev
```
## 📡 API Endpoints (Planned)
Method	           Endpoint	                 Description
POST	             /api/v1/auth/signup	     Register a new user
POST	             /api/v1/auth/login	       Authenticate user & token
GET	               /api/v1/users	           List all users (admin)
GET	               /api/v1/posts	           Fetch community posts

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
