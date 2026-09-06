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
Then, you have two main options depending on whether you are doing local development or managing a production database:
  ### Option 1: db push (Best for quick prototyping / local dev)

  This command synchronizes your Prisma schema directly with the database without generating any migration files.

    npx prisma db push

  ### Option 2: migrate dev (Best for production / keeping a history of changes)

  This command generates a SQL migration file to keep track of your schema changes over time and applies it to your database.

    npx prisma migrate dev --name your_migration_name

  (Optional) If you only want to generate the Prisma Client without updating the database, you would use:

    npx prisma generate

  Would you like me to run one of these commands for you right now? If so, just let me know which one!