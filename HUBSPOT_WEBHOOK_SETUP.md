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
4. Set content type: **application/json**

### Step 3: Configure Webhook Payload

Use this exact payload configuration:

```json
{
  "source": "hubspot",
  "customerEmail": "{{email}}",
  "subject": "{{subject}}",
  "body": "{{description}}"
}
```

### Step 4: Verify Property Mappings

Ensure these HubSpot properties are correctly mapped:

- **`{{email}}`** → Contact's email field (e.g., `email`, `contact_email`)
- **`{{subject}}`** → Ticket's subject field (e.g., `hs_ticket_subject`, `subject`)
- **`{{description}}`** → Ticket's description/body field (e.g., `content`, `hs_ticket_description`, `description`)

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
