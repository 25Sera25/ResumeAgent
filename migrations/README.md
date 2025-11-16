# Database Migrations

This directory contains database migrations for the ResumeAgent application.

## Running Migrations

To apply migrations to your database:

```bash
npm run db:migrate
```

Make sure you have set the `DATABASE_URL` environment variable before running migrations.

## Migration Files

- `0000_add_interview_prep_column.sql` - Adds the `interview_prep` column to the `resume_sessions` table
- `0001_add_tailored_resumes_columns.sql` - Adds missing columns to the `tailored_resumes` table (micro_edits, ai_improvements, response_received, response_date, source, referral)

## Migration Format

Migrations are managed by Drizzle Kit and follow the standard Drizzle migration format:
- SQL migration files in the root migrations directory
- Metadata in the `meta/` subdirectory

## Creating New Migrations

To create a new migration:

1. Update the schema in `shared/schema.ts`
2. Generate migration:
   ```bash
   npx drizzle-kit generate --name your_migration_name
   ```
3. Review the generated SQL in `migrations/`
4. Apply the migration:
   ```bash
   npm run db:migrate
   ```

## Schema Push (Alternative)

For development, you can also use schema push which syncs your schema directly without migrations:

```bash
npm run db:push
```

⚠️ **Warning**: Schema push is not recommended for production as it doesn't maintain migration history.
