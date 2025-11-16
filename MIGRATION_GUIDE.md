# Migration Guide: Fix interview_prep Column Error

## Problem
The application was throwing a 500 error when creating sessions:
```
column "interview_prep" of relation "resume_sessions" does not exist
```

This occurred because the `interviewPrep` field was added to the schema in `shared/schema.ts` but no database migration was created to add the column to the actual PostgreSQL database.

## Solution
A database migration has been created to add the missing `interview_prep` column to the `resume_sessions` table.

## How to Apply the Migration

### For Production (Render or other hosting)

1. **Update Environment Variables** (if not already set):
   Ensure `DATABASE_URL` is properly configured in your hosting platform's environment variables.

2. **Update Build Command**:
   Change your build command to include the migration:
   ```bash
   npm install && npm run build && npm run db:migrate
   ```

3. **Deploy**:
   Push your changes to trigger a new deployment. The migration will run automatically during the build process.

### For Local Development

1. **Ensure Database is Running**:
   Make sure your PostgreSQL database is running and accessible.

2. **Set Environment Variables**:
   Copy `.env.example` to `.env` and update `DATABASE_URL`:
   ```bash
   cp .env.example .env
   # Edit .env and set DATABASE_URL to your local database
   ```

3. **Run Migration**:
   ```bash
   npm run db:migrate
   ```

4. **Verify Migration**:
   Connect to your database and check the `resume_sessions` table:
   ```sql
   \d resume_sessions
   ```
   
   You should see the `interview_prep` column listed.

### For Existing Deployments (Manual Migration)

If you need to apply the migration manually to an existing database:

1. **Connect to your database** using your preferred PostgreSQL client.

2. **Run the migration SQL**:
   ```sql
   ALTER TABLE "resume_sessions" ADD COLUMN "interview_prep" json;
   ```

3. **Verify the column was added**:
   ```sql
   SELECT column_name, data_type, is_nullable 
   FROM information_schema.columns 
   WHERE table_name = 'resume_sessions' 
   AND column_name = 'interview_prep';
   ```

## Migration Details

### File: `migrations/0000_add_interview_prep_column.sql`
```sql
ALTER TABLE "resume_sessions" ADD COLUMN "interview_prep" json;
```

### Column Specifications:
- **Column Name**: `interview_prep`
- **Data Type**: `json`
- **Nullable**: `true` (default for new columns)
- **Purpose**: Stores interview questions and STAR examples for job applications

### Why This Column is Nullable:
The column is nullable to ensure existing records in the `resume_sessions` table remain valid. New sessions will populate this field with interview preparation data.

## Verification

After applying the migration, verify the fix by:

1. **Creating a new session**:
   - Navigate to the application
   - Create a new resume session
   - The 500 error should no longer occur

2. **Checking existing sessions**:
   - Existing sessions should continue to work
   - They will have `NULL` for `interview_prep` until updated

3. **Database check**:
   ```sql
   SELECT COUNT(*) FROM resume_sessions WHERE interview_prep IS NOT NULL;
   SELECT COUNT(*) FROM resume_sessions WHERE interview_prep IS NULL;
   ```

## Rollback (If Needed)

If you need to rollback this migration:

```sql
ALTER TABLE "resume_sessions" DROP COLUMN "interview_prep";
```

⚠️ **Warning**: This will permanently delete all interview preparation data.

## Future Migrations

For future schema changes:

1. Update the schema in `shared/schema.ts`
2. Generate a new migration:
   ```bash
   npx drizzle-kit generate --name descriptive_migration_name
   ```
3. Review the generated SQL
4. Apply the migration:
   ```bash
   npm run db:migrate
   ```

## Troubleshooting

### Migration Fails with "column already exists"
This means the column was already added manually or the migration was already applied. You can:
- Check if the column exists: `\d resume_sessions`
- Skip to the next migration (if the column is correct)

### "DATABASE_URL not set" Error
Ensure your `.env` file (local) or environment variables (production) include `DATABASE_URL`.

### Permission Denied Error
Ensure your database user has `ALTER TABLE` permissions.

## Support

If you encounter issues:
1. Check the error message in the console/logs
2. Verify `DATABASE_URL` is correctly set
3. Ensure the database is accessible
4. Check PostgreSQL logs for more details

For more information, see:
- [migrations/README.md](./migrations/README.md) - Migration system documentation
- [DEPLOYMENT.md](./DEPLOYMENT.md) - General deployment guide
