# Backend Setup (NestJS + Prisma)

This is the backend for the Billing Software project.

## Prerequisites
- Node.js (v18+)
- PostgreSQL (or your chosen database for Prisma)

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Create a `.env` file in the root of the `backend` directory.
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/mydb?schema=public"
   JWT_SECRET="your-secret-key"
   ```

3. **Prisma Setup**
   Generate the Prisma client and push the schema to the database:
   ```bash
   npx prisma generate
   npx prisma db push
   # Or if you are using migrations: npx prisma migrate dev
   ```

4. **Running the App**
   ```bash
   # development
   npm run start

   # watch mode
   npm run start:dev

   # production mode
   npm run start:prod
   ```

## Checking Drift
To check if your Prisma schema has drifted from your database:
```bash
npx prisma migrate status
```