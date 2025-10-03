# Dataset contract (external HubSpot export)

- Location: s3://.../datasets/training/<version>/
- Format: JSONL per line with messages array
- Redaction: PII removed or masked upstream; validated on ingest

Example JSONL line:
{"messages":[{"role":"user","content":"[customer email body]"},{"role":"assistant","content":"[final approved reply]"}],"provenance":{"source_ids":["ticket-123"],"redacted":true,"created_at":"2025-01-01T00:00:00Z"}}

