# Environment Files Management

## Single Source of Truth

This project uses **only one environment file**: `.env` in the project root.

## Rules

- **Never create multiple environment files** (`.env.local`, `.env.development`, etc.)
- **Always use `.env`** for all environment variables
- **Never commit environment files** to version control (they're in `.gitignore`)

## Current Configuration

The `.gitignore` file includes:
```
.env
.env.*
```

This prevents any environment file variants from being committed.

## Environment Variables

Current environment variables in `.env`:
- Database connections (Neon PostgreSQL)
- OpenAI API configuration
- Slack integration tokens
- Vercel deployment tokens
- Stack Auth configuration

## Best Practices

1. **Single file**: Use only `.env` in project root
2. **No duplicates**: Never create `.env.local` or similar files
3. **Secure**: All environment files are gitignored
4. **Consistent**: All apps and packages reference the same `.env` file

## Troubleshooting

If you accidentally create a duplicate environment file:
1. Compare contents with existing `.env`
2. Merge any unique variables into `.env`
3. Delete the duplicate file
4. Verify `.gitignore` includes `.env.*` pattern
