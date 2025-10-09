# Slack Bot

HITM review flow: Approve/Reject/Edit interactive messages and modals.

Production uses the serverless interactions endpoint at `api/slack/interactions.ts`.  
For local development with the Bolt app, set `SLACK_USE_BOLT_LOCAL=true` and run `pnpm slack:dev`.  
When `SLACK_USE_BOLT_LOCAL` is not true, Bolt action handlers are not registered to avoid conflicts with the serverless handler.

