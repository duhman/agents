# HubSpot Webhook Setup Guide

## Overview

This guide explains how to configure HubSpot to send ticket data directly to the webhook endpoint using the new webhook-only approach (no custom code required).

## HubSpot Workflow Configuration

### Step 1: Remove Custom Code Action

1. Open your HubSpot workflow
2. Remove the existing custom code action entirely
3. This eliminates the complex field extraction logic

### Step 2: Add Webhook Action

1. Add a new "Send webhook" action to your workflow
2. Configure the webhook URL: `https://your-app.vercel.app/api/webhook`
3. Set request method: **POST**
4. ~~Set content type: **application/json**~~ *(HubSpot automatically sets this to `application/json`)*

### Step 3: Configure Webhook Payload

1. Select **"Customize request body"** (not "Include all ticket properties")
2. Add these key-value pairs using the "Add property" button:

| Key | Value |
|-----|-------|
| `source` | `hubspot` |
| `customerEmail` | `{{email}}` |
| `subject` | `{{subject}}` |
| `body` | `{{content}}` |

**Important:** Make sure you're using the **internal property names** (`subject` and `content`), not the display labels. In HubSpot's property picker, you may see labels like "Ticket name" or "Ticket description", but the internal API names are `subject` and `content`.

**Note:** HubSpot automatically sends the data as JSON with `Content-Type: application/json` header - no manual configuration needed.

### Step 4: Verify Property Mappings

Ensure these HubSpot properties are correctly mapped:

- **`{{email}}`** → Contact's email field (standard property: `email`)
- **`{{subject}}`** → Ticket's subject field (standard property: `subject`)
- **`{{content}}`** → Ticket's content/body field (standard property: `content`)

**Important:** These property names are based on the [official HubSpot CRM API documentation](https://developers.hubspot.com/docs/api-reference/crm-tickets-v3/guide). 

**Note:** If you're working with email engagements rather than tickets, you might need to use:
- `hs_email_subject` for email subject
- `hs_email_text` for email body content

However, for ticket-based workflows, use `subject` and `content` as shown above.

## Testing the Setup

### Test with curl

```bash
# Test new webhook format
curl -X POST https://your-app.vercel.app/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "source": "hubspot",
    "customerEmail": "test@example.com",
    "subject": "Oppsigelse",
    "body": "Hei, jeg skal flytte og vil si opp."
  }'
```

### Expected Response

```json
{
  "success": true,
  "ticket_id": "uuid-here",
  "draft_id": "uuid-here",
  "confidence": 0.95,
  "route": "cancellation",
  "request_id": "uuid-here",
  "processing_time_ms": 1234
}
```

## Troubleshooting

### Common Issues

1. **Missing subject or body**: Ensure HubSpot properties are correctly mapped
2. **Webhook timeout**: Check that your webhook URL is accessible
3. **Validation errors**: Verify the payload format matches exactly
4. **"URL is invalid" error**: Ensure your webhook URL is accessible and returns a 200 status code
5. **Content-Type confusion**: Remember that HubSpot automatically sets `Content-Type: application/json` - you don't need to configure this

### Debug Steps

1. Check HubSpot workflow logs for webhook delivery status
2. Check Vercel function logs: `vercel logs --follow`
3. Verify Slack channel receives draft reviews
4. Test with curl to isolate HubSpot vs webhook issues

## Benefits of This Approach

- ✅ **Simpler setup**: No custom code required
- ✅ **More reliable**: Direct field mapping from HubSpot
- ✅ **Better error handling**: Clear validation messages
- ✅ **Easier debugging**: Standard webhook format
- ✅ **Backward compatible**: Legacy format still supported

## Migration Notes

- The webhook handler supports both new and legacy formats
- Existing integrations using `rawEmail` will continue to work
- No breaking changes for current deployments
- Gradual migration is possible
