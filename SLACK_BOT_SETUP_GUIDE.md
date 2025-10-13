# Slack Bot Setup Guide

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

## Bot Token Verification

Ensure your bot token has the correct scopes by testing with this API call:

```bash
curl -H "Authorization: Bearer YOUR_BOT_TOKEN" \
     https://slack.com/api/auth.test
```

The response should show your bot's capabilities and scopes.

## Common Issues:

1. **Missing Scopes**: Bot won't be able to open modals
2. **Not Reinstalled**: Scope changes don't take effect until app is reinstalled
3. **Wrong Request URL**: Interactive components won't work
4. **Expired Token**: Bot token may need to be regenerated

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
