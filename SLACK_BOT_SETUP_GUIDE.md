# Slack Bot Setup Guide

## Environment Variables Required

Add these to your `.env` file and Vercel environment:

- **`SLACK_BOT_TOKEN`** (Required) - Bot User OAuth Token from Slack app settings
- **`SLACK_SIGNING_SECRET`** (Required) - Signing Secret for request verification from Slack app settings
- **`SLACK_REVIEW_CHANNEL`** (Required) - Channel ID where draft reviews are posted
- **`CRON_SECRET`** (Required) - Secret for authenticating cron job requests

## Required OAuth Scopes for Modal Interactions

Your Slack bot MUST have the following OAuth scopes to open modals and handle interactions:

### Essential Scopes:

- **`chat:write`** - Send messages as the bot
- **`commands`** - Invoke slash commands
- **`im:write`** - Send messages in direct messages
- **`channels:read`** - View public channel information
- **`groups:read`** - View private channel information
- **`users:read`** - Get user information
- **`users:read.email`** - Get user information by email

### How to Check/Update Scopes:

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Select your app
3. Go to **OAuth & Permissions** in the left sidebar
4. Under **Scopes** section, verify all required scopes are listed
5. If missing any scopes, add them and click **Save Changes**
6. **IMPORTANT**: Reinstall the app to your workspace to apply changes

## Interactive Components Configuration

1. In your Slack app settings, go to **Interactivity & Shortcuts**
2. Ensure **Interactivity** is turned ON
3. Set **Request URL** to: `https://your-domain.vercel.app/api/slack/interactions`
4. Click **Save Changes**

## Request Signature Verification

The integration now includes cryptographic signature verification to prevent unauthorized requests.

### Setup:

1. Go to your Slack app settings > **Basic Information**
2. Copy the **Signing Secret**
3. Add it to your environment variables as `SLACK_SIGNING_SECRET`

### How it works:

- Each request from Slack includes a signature in the `X-Slack-Signature` header
- The signature is computed using HMAC SHA256 with your signing secret
- Requests are rejected if:
  - Signature is missing or invalid
  - Timestamp is older than 5 minutes (prevents replay attacks)

### Troubleshooting:

- If requests are being rejected with `invalid_signature` error, verify:
  - `SLACK_SIGNING_SECRET` matches your Slack app's Signing Secret
  - Your server clock is synchronized (timestamp validation)
  - Request body is not being modified by middleware

## Bot Token Verification

Ensure your bot token has the correct scopes by testing with this API call:

```bash
curl -H "Authorization: Bearer YOUR_BOT_TOKEN" \
     https://slack.com/api/auth.test
```

The response should show your bot's capabilities and scopes.

## Database Setup

The integration now uses a persistent database for retry queue management.

### Migration Required:

Run the database migration to create the `slack_retry_queue` table:

```bash
# Apply migration
psql $DATABASE_URL -f packages/db/migrations/0001_add_slack_retry_queue.sql
```

### Retry Queue Features:

- **Persistent storage**: Retries survive serverless function cold starts
- **Exponential backoff**: 5 min, 10 min, 20 min retry intervals
- **Status tracking**: pending, processing, succeeded, failed
- **Auditing**: All retry attempts are logged with errors
- **Max retries**: 3 attempts before marking as failed

### Monitoring:

- Check retry queue stats at `/api/cron/process-slack-retry` (POST with `CRON_SECRET`)
- Failed items remain in database for debugging

## Common Issues:

1. **Missing Scopes**: Bot won't be able to open modals
2. **Not Reinstalled**: Scope changes don't take effect until app is reinstalled
3. **Wrong Request URL**: Interactive components won't work
4. **Expired Token**: Bot token may need to be regenerated
5. **Invalid Signature**: Check `SLACK_SIGNING_SECRET` matches your app
6. **Bot Not In Channel**: Invite bot with `/invite @bot` in the channel
7. **Modal Timing**: Ensure `views.open` is called within 3 seconds

## Testing Modal Opening:

Use this test payload to verify your setup:

```bash
curl -X POST https://slack.com/api/views.open \
  -H "Authorization: Bearer YOUR_BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "trigger_id": "VALID_TRIGGER_ID",
    "view": {
      "type": "modal",
      "title": {"type": "plain_text", "text": "Test Modal"},
      "blocks": [
        {
          "type": "section",
          "text": {"type": "plain_text", "text": "This is a test modal"}
        }
      ]
    }
  }'
```

If this fails, check your bot's scopes and token validity.
