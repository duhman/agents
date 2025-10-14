# Documentation

This directory contains all project documentation organized by category.

## 📁 Structure

```
documentation/
├── README.md                    # This file
├── cursor/                      # Cursor IDE setup and configuration
│   ├── CURSOR_SETUP.md         # Initial setup guide
│   ├── CURSOR_OPTIMIZATION.md   # All optimizations applied
│   ├── CURSOR_LATEST_FEATURES.md # Latest features (Jan 2025)
│   ├── CURSOR_MIGRATION_SUMMARY.md # Feature migration overview
│   ├── CURSOR_RULES_MIGRATION.md # Rules migration guide
│   └── CURSOR_RULES_SUMMARY.md  # Rules quick reference
├── deployment/                  # Deployment and setup guides
│   ├── QUICKSTART.md           # Local setup (<10 minutes)
│   ├── DEPLOYMENT.md           # Vercel deployment guide
│   ├── VERCEL_DEVELOPMENT.md   # Vercel-specific development patterns
│   └── ENVIRONMENT_VARIABLES.md # Environment variables reference
└── project/                     # Project documentation
    ├── prd.md                  # Product Requirements Document
    ├── plan.md                 # Technical implementation plan
    ├── policies.md             # Tone, language, cancellation policies
    ├── prompts.md              # Prompt templates overview
    ├── datasets.md             # Dataset contract (external HubSpot)
    └── rules/                  # Legacy rules (migrated to .cursor/rules/)
```

## 📖 Quick Links

### Getting Started

- **New to the project?** Start with [`deployment/QUICKSTART.md`](deployment/QUICKSTART.md)
- **Setting up Cursor?** See [`cursor/CURSOR_SETUP.md`](cursor/CURSOR_SETUP.md)
- **Understanding the project?** Read [`project/prd.md`](project/prd.md)

### Development

- **Technical architecture:** [`project/plan.md`](project/plan.md)
- **Policies & tone:** [`project/policies.md`](project/policies.md)
- **Prompt engineering:** [`project/prompts.md`](project/prompts.md)

### Cursor IDE

- **Setup guide:** [`cursor/CURSOR_SETUP.md`](cursor/CURSOR_SETUP.md)
- **All optimizations:** [`cursor/CURSOR_OPTIMIZATION.md`](cursor/CURSOR_OPTIMIZATION.md)
- **Latest features:** [`cursor/CURSOR_LATEST_FEATURES.md`](cursor/CURSOR_LATEST_FEATURES.md)
- **Rules migration:** [`cursor/CURSOR_RULES_MIGRATION.md`](cursor/CURSOR_RULES_MIGRATION.md)

### Deployment

- **Local development:** [`deployment/QUICKSTART.md`](deployment/QUICKSTART.md)
- **Production deployment:** [`deployment/DEPLOYMENT.md`](deployment/DEPLOYMENT.md)
- **Vercel development:** [`deployment/VERCEL_DEVELOPMENT.md`](deployment/VERCEL_DEVELOPMENT.md)
- **Environment variables:** [`deployment/ENVIRONMENT_VARIABLES.md`](deployment/ENVIRONMENT_VARIABLES.md)

## 🎯 Documentation by Role

### For Developers

1. [`deployment/QUICKSTART.md`](deployment/QUICKSTART.md) - Get running locally in <10 min
2. [`project/plan.md`](project/plan.md) - Understand the architecture
3. [`cursor/CURSOR_SETUP.md`](cursor/CURSOR_SETUP.md) - Configure your IDE

### For Product/Team Leads

1. [`project/prd.md`](project/prd.md) - Goals, KPIs, requirements
2. [`project/policies.md`](project/policies.md) - Business policies
3. [`deployment/DEPLOYMENT.md`](deployment/DEPLOYMENT.md) - Production setup

### For DevOps/SRE

1. [`deployment/DEPLOYMENT.md`](deployment/DEPLOYMENT.md) - Vercel setup
2. [`deployment/ENVIRONMENT_VARIABLES.md`](deployment/ENVIRONMENT_VARIABLES.md) - Environment configuration
3. [`project/plan.md`](project/plan.md) - Infrastructure requirements
4. [`project/datasets.md`](project/datasets.md) - Data pipeline contract
5. [`../SLACK_INTEGRATION_ENHANCEMENTS.md`](../SLACK_INTEGRATION_ENHANCEMENTS.md) - Slack reliability improvements

## 📝 Documentation Standards

### Naming Conventions

- Use UPPERCASE for root-level guides (e.g., `QUICKSTART.md`, `DEPLOYMENT.md`)
- Use lowercase for content docs (e.g., `prd.md`, `policies.md`)
- Use descriptive prefixes for related docs (e.g., `CURSOR_*` for Cursor docs)

### Structure

Each documentation file should include:

- Clear title and purpose
- Table of contents (for longer docs)
- Step-by-step instructions where applicable
- Code examples with syntax highlighting
- References to related documentation

### Updating Documentation

- Keep documentation in sync with code changes
- Update relevant docs when features change
- Add migration guides for breaking changes
- Cross-reference related documentation

## 🔗 External References

- [Cursor Documentation](https://cursor.com/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs)
- [Slack Bolt Documentation](https://api.slack.com/bolt-js)
- [Vercel Documentation](https://vercel.com/docs)

---

**Last Updated:** January 2025  
**Maintained by:** Development Team
