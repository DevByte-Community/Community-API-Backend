# Migration Guide for Supabase PostgreSQL

This guide will walk you through pushing your Sequelize migrations to a Supabase-hosted PostgreSQL database.

## Prerequisites

- A Supabase project with a PostgreSQL database
- Your Supabase database connection credentials
- Node.js and npm installed
- Sequelize CLI installed (already in your dependencies)

## Step 1: Get Your Supabase Connection String

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Navigate to **Settings** → **Database**
4. Scroll down to **Connection string** section
5. Select **URI** tab
6. Copy the connection string. It will look like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

## Step 2: Set Up Environment Variable

### Option A: Using .env file (Recommended for local development)

1. Create or update your `.env` file in the project root:
   ```bash
   # Production Database (Supabase)
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   NODE_ENV=production
   ```

   **Important:** Replace `[YOUR-PASSWORD]` with your actual database password and `[PROJECT-REF]` with your project reference.

### Option B: Using Environment Variable Directly

You can also set the environment variable directly in your terminal:

```bash
export DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
export NODE_ENV=production
```

### Option C: Using Supabase Connection Pooling (Recommended for Production)

For better performance and connection management, use the connection pooler:

1. In Supabase Dashboard → **Settings** → **Database**
2. Use the **Connection pooling** string (port 6543) instead:
   ```
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```

## Step 3: Verify Your Configuration

Your `config/config.js` already has production configuration set up with SSL support:

```javascript
production: {
  use_env_variable: 'DATABASE_URL',
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
},
```

This configuration:
- Uses the `DATABASE_URL` environment variable
- Enables SSL (required for Supabase)
- Sets `rejectUnauthorized: false` (Supabase uses self-signed certificates)

## Step 4: Run Migrations

### Check Migration Status

First, check which migrations have already been run:

```bash
npm run migrate:status:prod
```

This will show you which migrations have been executed and which are pending.

### Run All Pending Migrations

To run all pending migrations:

```bash
npm run migrate:prod
```

This command automatically sets `NODE_ENV=production` and runs all pending migrations.

### Run a Specific Migration

If you need to run migrations up to a specific one:

```bash
NODE_ENV=production npx sequelize-cli db:migrate --to 20250928122020-create-user-skills.js
```

Or you can use:
```bash
cross-env NODE_ENV=production npx sequelize-cli db:migrate --to 20250928122020-create-user-skills.js
```

## Step 5: Verify Migrations

After running migrations, verify they were applied:

1. Check in Supabase Dashboard:
   - Go to **Table Editor** to see your tables
   - You should see: `Users`, `Skills`, `UserSkills`, `Preferences`, and `SequelizeMeta`

2. Or check via SQL Editor in Supabase:
   ```sql
   SELECT * FROM "SequelizeMeta" ORDER BY name;
   ```

## Step 6: Rollback (If Needed)

If you need to rollback the last migration:

```bash
npm run migrate:undo:prod
```

To rollback all migrations:

```bash
npm run migrate:undo:all:prod
```

**⚠️ Warning:** Rolling back migrations in production should be done with extreme caution. Always backup your database first!

## Troubleshooting

### Error: "SSL connection required"

**Solution:** Make sure your `DATABASE_URL` includes SSL parameters or your config has SSL enabled (which it does).

### Error: "password authentication failed"

**Solution:** 
- Verify your database password in Supabase Dashboard → Settings → Database
- Make sure the password in your connection string is URL-encoded (replace special characters with % encoding)

### Error: "relation does not exist"

**Solution:** 
- Make sure you've run migrations: `npm run migrate:prod`
- Check if the `SequelizeMeta` table exists in your database

### Error: "Connection timeout"

**Solution:**
- Check if your IP is allowed in Supabase (Settings → Database → Connection pooling)
- Supabase allows connections from anywhere by default, but verify your network settings
- Try using the connection pooler (port 6543) instead of direct connection (port 5432)

### Migration Already Exists Error

If you get an error that a migration already exists:

1. Check the `SequelizeMeta` table:
   ```sql
   SELECT * FROM "SequelizeMeta";
   ```

2. If the migration is listed but the table doesn't exist, you may need to manually fix the state

## Best Practices

1. **Always backup your database** before running migrations in production
2. **Test migrations locally** first using a local PostgreSQL instance
3. **Use connection pooling** for production (port 6543)
4. **Keep your `.env` file secure** - never commit it to version control
5. **Use environment-specific configs** - your config.js already supports this
6. **Run migrations in a transaction** when possible (Sequelize does this by default)

## Example Workflow

```bash
# 1. Set environment variable (add to .env file or export)
export DATABASE_URL="postgresql://postgres:yourpassword@db.xxxxx.supabase.co:5432/postgres"

# 2. Check current migration status
npm run migrate:status:prod

# 3. Run migrations
npm run migrate:prod

# 4. Verify in Supabase Dashboard
# Go to Table Editor and check your tables (Users, Skills, UserSkills, Preferences)
```

## Available Migration Scripts

Your `package.json` includes the following production migration scripts:

| Script | Description |
|--------|-------------|
| `npm run migrate:status:prod` | Check which migrations have been run |
| `npm run migrate:prod` | Run all pending migrations |
| `npm run migrate:undo:prod` | Rollback the last migration |
| `npm run migrate:undo:all:prod` | Rollback all migrations |

**Note:** All production scripts automatically set `NODE_ENV=production` using `cross-env`, so you don't need to manually set it.

For local development, use the non-`:prod` versions:
- `npm run migrate:status` - Check migration status (development)
- `npm run migrate` - Run migrations (development)
- `npm run migrate:undo` - Rollback last migration (development)

## Additional Resources

- [Supabase Database Documentation](https://supabase.com/docs/guides/database)
- [Sequelize CLI Documentation](https://github.com/sequelize/cli)
- [Sequelize Migrations Guide](https://sequelize.org/docs/v6/other-topics/migrations/)

