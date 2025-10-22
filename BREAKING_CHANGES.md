# Breaking Changes

## January 2025 - Webhook Format

### Removed: Legacy `rawEmail` Format

The webhook endpoint no longer accepts the `rawEmail` field. You must use the new format:

**Before (DEPRECATED):**

```json
{
  "source": "hubspot",
  "customerEmail": "test@example.com",
  "rawEmail": "Subject: Test\n\nBody content"
}
```

**After (REQUIRED):**

```json
{
  "source": "hubspot",
  "customerEmail": "test@example.com",
  "subject": "Test",
  "body": "Body content"
}
```

### Migration Required

Update your HubSpot workflow to use the new webhook format. See HUBSPOT_WEBHOOK_SETUP.md for details.

### Error Response

Webhooks using the old format will now receive a 400 error:

```json
{
  "error": "validation: subject and body are required",
  "request_id": "uuid-here"
}
```

### Testing

Test the new format:

```bash
# Should succeed
curl -X POST https://your-app.vercel.app/api/webhook \
  -H "Content-Type: application/json" \
  -d '{"source":"hubspot","customerEmail":"test@example.com","subject":"Test","body":"Content"}'

# Should fail with 400 error
curl -X POST https://your-app.vercel.app/api/webhook \
  -H "Content-Type: application/json" \
  -d '{"source":"hubspot","customerEmail":"test@example.com","rawEmail":"Subject: Test\n\nContent"}'
```
