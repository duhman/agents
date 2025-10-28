# Slack Bot Setup Guide

## Quick Start: Use App Manifest (Recommended)

The easiest way to set up the bot is to use the Slack App Manifest. This ensures all required scopes and settings are configured correctly.

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and click **Create New App**
2. Choose **From an app manifest** and select your workspace
3. Copy the manifest from `apps/slack-bot/manifest.json` and paste it into the dialog
4. Review and confirm the settings
5. Click **Create** - the app is now installed with the correct scopes and settings

**No need for manual scope configuration if using the manifest!**

Alternatively, visit [docs.slack.dev/elements/manifests](https://docs.slack.dev/elements/manifests) for more details on app manifests.

## Environment Variables Required

Add these to your `.env` file and Vercel environment:

- **`SLACK_BOT_TOKEN`** (Required) - Bot User OAuth Token from Slack app settings
- **`SLACK_SIGNING_SECRET`** (Required) - Signing Secret for request verification from Slack app settings
- **`SLACK_REVIEW_CHANNEL`** (Required) - Channel ID where draft reviews are posted
- **`CRON_SECRET`** (Required) - Secret for authenticating cron job requests
- **`ALLOW_INSECURE_SLACK_DEV`** (Optional) - Set to `true` in local dev to allow Slack requests without signature verification. **Never enable in production.**

## Required OAuth Scopes for Modal Interactions

If you're setting up manually (not using the manifest), ensure your Slack bot has these OAuth scopes:

### Essential Scopes:

- **`chat:write`** - Send messages as the bot
- **`commands`** - Invoke slash commands
- **`im:write`** - Send messages in direct messages
- **`channels:read`** - View public channel information
- **`groups:read`** - View private channel information
- **`users:read`** - Get user information
- **`users:read.email`** - Get user information by email

Reference: [OAuth Scopes](https://docs.slack.dev/authentication/oauth-v2/scopes)

### How to Check/Update Scopes (Manual Setup):

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

Reference: [Interactivity & Shortcuts](https://docs.slack.dev/surfaces/modals)

## Request Signature Verification

The integration includes cryptographic signature verification to prevent unauthorized requests.

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
  - In local development, you can opt-in to insecure mode by setting `ALLOW_INSECURE_SLACK_DEV=true`

Reference: [Request signing verification](https://docs.slack.dev/authentication/verifying-requests-from-slack)

## Bot Token Verification

Ensure your bot token has the correct scopes by testing with this API call:

```bash
curl -H "Authorization: Bearer YOUR_BOT_TOKEN" \
     https://slack.com/api/auth.test
```

The response should show your bot's capabilities and scopes.

Reference: [auth.test method](https://docs.slack.dev/methods/auth/auth.test)

## Database Setup

The integration uses a persistent database for retry queue management.

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

## Runtime Capabilities Check

The system performs automatic health checks on startup and via `/api/health`:

- Validates bot token validity
- Confirms required OAuth scopes are present
- Tests Slack API connectivity

If checks fail, clear remediation steps are logged. Check your logs for details.

## Common Issues:

1. **Missing Scopes**: Bot won't be able to open modals
   - Solution: Reinstall the app to apply scope changes
2. **Not Reinstalled**: Scope changes don't take effect until app is reinstalled
   - Solution: Go to your app in [api.slack.com/apps](https://api.slack.com/apps) and reinstall
3. **Wrong Request URL**: Interactive components won't work
   - Solution: Verify `/api/slack/interactions` is set as Interactivity URL
4. **Expired Token**: Bot token may need to be regenerated
   - Solution: Regenerate bot token in OAuth settings
5. **Invalid Signature**: Check `SLACK_SIGNING_SECRET` matches your app
   - Solution: Verify signing secret in Basic Information tab
6. **Bot Not In Channel**: Invite bot with `/invite @bot` in the channel
   - Solution: In the channel, type `/invite @<bot-name>`
7. **Modal Timing**: Ensure `views.open` is called within 3 seconds
   - Solution: Keep modal logic synchronous in the 3-second window
8. **ALLOW_INSECURE_SLACK_DEV issues**: Local requests failing signature verification
   - Solution: Set `ALLOW_INSECURE_SLACK_DEV=true` in `.env` for local development only

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

## Additional Resources

- [Slack App Manifest Documentation](https://docs.slack.dev/elements/manifests)
- [Block Kit Reference](https://docs.slack.dev/reference/block-kit)
- [Web API Methods](https://docs.slack.dev/methods)
- [Slack Developer Docs](https://docs.slack.dev)
