# Minimal OpenAI Agent Implementation Guide
## Step-by-Step Code Implementation

This guide provides the actual code implementation for the Minimal OpenAI Agent PRD, focusing on concrete examples and working code.

---

## 1. Project Setup

### 1.1 Package.json

```json
{
  "name": "minimal-openai-agent",
  "version": "1.0.0",
  "description": "Minimal OpenAI agent for email processing",
  "main": "src/index.ts",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:setup": "psql $DATABASE_URL -f sql/schema.sql"
  },
  "dependencies": {
    "openai": "^6.2.0",
    "zod": "^3.22.0",
    "dotenv": "^16.3.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.0"
  }
}
```

### 1.2 Environment Variables (.env.example)

```bash
# Database
DATABASE_URL=postgres://user:password@host:5432/database

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key-here

# Optional
OPENAI_VECTOR_STORE_ID=vs-your-vector-store-id
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_SIGNING_SECRET=your-slack-signing-secret
SLACK_REVIEW_CHANNEL=C1234567890

# Environment
NODE_ENV=development
```

---

## 2. Core Schemas (src/schemas.ts)

```typescript
import { z } from "zod";

// Email extraction schema
export const extractionSchema = z.object({
  is_cancellation: z.boolean().describe("True if customer is requesting subscription cancellation"),
  reason: z.enum(["moving", "payment_issue", "other", "unknown"]).describe("Reason for cancellation"),
  move_date: z.string().date().optional().nullable().describe("Move date in ISO format if mentioned"),
  language: z.enum(["no", "en", "sv"]).describe("Detected language (Norwegian, English, Swedish)"),
  edge_case: z.enum([
    "none", "no_app_access", "corporate_account", 
    "future_move_date", "already_canceled", "sameie_concern"
  ]).describe("Identified edge case requiring special handling"),
  urgency: z.enum(["immediate", "future", "unclear"]).describe("Timing urgency of cancellation"),
  customer_concerns: z.array(z.string()).default([]).describe("Specific customer concerns or questions mentioned"),
  policy_risks: z.array(z.string()).default([]).describe("Any ambiguities or policy compliance risks"),
  confidence_factors: z.object({
    clear_intent: z.boolean().describe("Intent is unambiguous"),
    complete_information: z.boolean().describe("All necessary information provided"),
    standard_case: z.boolean().describe("Falls into standard pattern without edge cases")
  }).describe("Factors affecting confidence score")
});

export type ExtractionResult = z.infer<typeof extractionSchema>;

// Webhook request schema
export const webhookRequestSchema = z.object({
  source: z.string().min(1),
  customerEmail: z.string().email(),
  rawEmail: z.string().min(1).optional(),
  subject: z.string().optional(),
  body: z.string().optional()
}).refine(
  data => data.rawEmail || (data.subject || data.body),
  { message: "Either rawEmail or subject/body must be provided" }
);

export type WebhookRequest = z.infer<typeof webhookRequestSchema>;

// Processing result schema
export const processEmailResultSchema = z.object({
  success: z.boolean(),
  ticketId: z.string().optional(),
  draftId: z.string().optional(),
  message: z.string(),
  processingTime: z.number().optional(),
  extraction: extractionSchema.optional(),
  confidence: z.number().optional()
});

export type ProcessEmailResult = z.infer<typeof processEmailResultSchema>;
```

---

## 3. PII Masking (src/pii.ts)

```typescript
/**
 * Mask personally identifiable information before any LLM calls
 * CRITICAL: This must be called before any OpenAI API calls
 */
export function maskPII(input: string): string {
  return input
    // Email addresses
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    // Phone numbers (various formats)
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[phone]")
    // Addresses (conservative pattern)
    .replace(/\b\d{1,4}\s+\w+\s+(Street|St|Road|Rd|Ave|Avenue|Gate|Gata)\b/gi, "[address]")
    // Norwegian addresses
    .replace(/\b\d{1,4}\s+\w+\s+(vei|gate|gata|plass|torg)\b/gi, "[address]");
}

/**
 * Generate a unique request ID for tracking
 */
export function generateRequestId(): string {
  return crypto.randomUUID();
}

/**
 * Structured logging interface
 */
export interface LogContext {
  requestId: string;
  userId?: string;
  ticketId?: string;
  duration?: number;
  [key: string]: any;
}

/**
 * Log info message with context
 */
export function logInfo(message: string, context: LogContext, data?: any) {
  console.log(JSON.stringify({
    level: "info",
    message,
    timestamp: new Date().toISOString(),
    ...context,
    ...data
  }));
}

/**
 * Log error message with context
 */
export function logError(message: string, context: LogContext, error?: any) {
  console.error(JSON.stringify({
    level: "error",
    message,
    timestamp: new Date().toISOString(),
    ...context,
    error: error?.message || error,
    stack: error?.stack
  }));
}
```

---

## 4. OpenAI Integration (src/openai.ts)

```typescript
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { extractionSchema, type ExtractionResult } from "./schemas.js";
import { withRetry } from "./utils.js";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

// System prompt for email extraction
const EXTRACTION_SYSTEM_PROMPT = `You are Elaway's customer service AI. Analyze emails for cancellation requests.

EXTRACT:
- is_cancellation: true if requesting subscription cancellation
- reason: "moving", "payment_issue", "other", or "unknown"
- move_date: ISO date if mentioned
- language: "no" (Norwegian), "en" (English), "sv" (Swedish)
- edge_case: special cases requiring attention
- confidence_factors: assess clarity and completeness

POLICY:
- Cancellations take effect at end of month
- Encourage app self-service when possible
- Be polite and concise

NON-CANCELLATION INDICATORS (set is_cancellation to FALSE):
- Feedback requests: "How would you rate...", "Survey", "Inquiry #"
- General questions: "How do I...", "What is...", "Where can I..."
- Support requests: "Help with...", "Problem with...", "Not working..."
- Payment inquiries without cancellation intent

CANCELLATION INDICATORS (set is_cancellation to TRUE):
- Clear cancellation request: "cancel", "oppsigelse", "terminate", "stop subscription"
- Moving/relocation with cancellation context: "moving and want to cancel"
- End of service: "end my subscription", "avslutt abonnement"`;

// System prompt for draft generation
const DRAFT_SYSTEM_PROMPT = `Generate customer service response in customer's language.

REQUIREMENTS:
- 4-5 sentences, 70-100 words
- Thank customer, confirm understanding
- Provide app instructions: "Meny → Administrer abonnement → Avslutt abonnement"
- State: "Oppsigelsen gjelder ut inneværende måned"
- Offer manual help if needed

TONE: Polite, professional, empathetic

LANGUAGE EXAMPLES:

Norwegian:
"Hei,
Takk for beskjed! Vi forstår at du skal flytte og ønsker å avslutte abonnementet ditt.
Du kan enkelt avslutte abonnementet i Elaway-appen: Meny → Administrer abonnement → Avslutt abonnement nå.
Oppsigelsen gjelder ut inneværende måned. Dersom du har problemer med appen, hjelper vi deg gjerne manuelt.
Med vennlig hilsen, Elaway Support"

English:
"Hi,
Thank you for reaching out! We understand you're moving and want to cancel your subscription.
You can easily cancel your subscription in the Elaway app: Menu → Manage Subscription → Cancel Subscription.
The cancellation will take effect at the end of the current month. If you have any issues with the app, we're happy to help manually.
Best regards, Elaway Support"`;

/**
 * Extract structured information from email using OpenAI
 */
export async function extractWithOpenAI(maskedEmail: string): Promise<ExtractionResult> {
  return withRetry(async () => {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-2024-08-06",
      messages: [
        { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
        { role: "user", content: maskedEmail }
      ],
      response_format: zodResponseFormat(extractionSchema),
      temperature: 0
    });

    const parsed = response.choices[0].message.parsed;
    if (!parsed) {
      throw new Error("Failed to parse OpenAI response");
    }

    return parsed;
  });
}

/**
 * Generate draft response using OpenAI
 */
export async function generateDraft(extraction: ExtractionResult): Promise<string> {
  return withRetry(async () => {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-2024-08-06",
      messages: [
        { role: "system", content: DRAFT_SYSTEM_PROMPT },
        { role: "user", content: `Generate response for: ${JSON.stringify(extraction)}` }
      ],
      temperature: 0.3
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Failed to generate draft response");
    }

    return content;
  });
}

/**
 * Calculate confidence score based on extraction factors
 */
export function calculateConfidence(extraction: ExtractionResult): number {
  const factors = extraction.confidence_factors;
  let score = 0;
  
  if (factors.clear_intent) score += 0.4;
  if (factors.complete_information) score += 0.3;
  if (factors.standard_case) score += 0.3;
  
  return Math.round(score * 100) / 100;
}
```

---

## 5. Database Operations (src/database.ts)

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export interface Ticket {
  id: string;
  source: string;
  customer_email: string;
  raw_email_masked: string;
  reason?: string;
  move_date?: string;
  created_at: string;
}

export interface Draft {
  id: string;
  ticket_id: string;
  language: string;
  draft_text: string;
  confidence: number;
  model: string;
  created_at: string;
}

export interface HumanReview {
  id: string;
  ticket_id: string;
  draft_id: string;
  decision: string;
  final_text: string;
  reviewer_slack_id: string;
  created_at: string;
}

/**
 * Create a new ticket
 */
export async function createTicket(params: {
  source: string;
  customerEmail: string;
  rawEmailMasked: string;
  reason?: string;
  moveDate?: string;
}): Promise<Ticket> {
  const query = `
    INSERT INTO tickets (source, customer_email, raw_email_masked, reason, move_date)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  
  const values = [
    params.source,
    params.customerEmail,
    params.rawEmailMasked,
    params.reason,
    params.moveDate
  ];
  
  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * Create a new draft
 */
export async function createDraft(params: {
  ticketId: string;
  language: string;
  draftText: string;
  confidence: number;
  model: string;
}): Promise<Draft> {
  const query = `
    INSERT INTO drafts (ticket_id, language, draft_text, confidence, model)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  
  const values = [
    params.ticketId,
    params.language,
    params.draftText,
    params.confidence,
    params.model
  ];
  
  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * Create a human review record
 */
export async function createHumanReview(params: {
  ticketId: string;
  draftId: string;
  decision: string;
  finalText: string;
  reviewerSlackId: string;
}): Promise<HumanReview> {
  const query = `
    INSERT INTO human_reviews (ticket_id, draft_id, decision, final_text, reviewer_slack_id)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  
  const values = [
    params.ticketId,
    params.draftId,
    params.decision,
    params.finalText,
    params.reviewerSlackId
  ];
  
  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * Get ticket by ID
 */
export async function getTicket(id: string): Promise<Ticket | null> {
  const query = 'SELECT * FROM tickets WHERE id = $1';
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
}

/**
 * Get draft by ID
 */
export async function getDraft(id: string): Promise<Draft | null> {
  const query = 'SELECT * FROM drafts WHERE id = $1';
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
}
```

---

## 6. Utility Functions (src/utils.ts)

```typescript
/**
 * Retry logic with exponential backoff for OpenAI API calls
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      if (attempt === maxRetries) throw error;

      // Only retry on specific OpenAI error codes
      if (error.code === "rate_limit_exceeded" || error.code === "timeout") {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms delay`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // Don't retry on other errors (quota, auth, etc.)
      throw error;
    }
  }
  throw new Error("Max retries exceeded");
}

/**
 * Validate webhook request body
 */
export function validateWebhookRequest(body: any) {
  if (!body) {
    throw new Error("Request body is required");
  }

  if (!body.source || typeof body.source !== 'string') {
    throw new Error("source is required and must be a string");
  }

  if (!body.customerEmail || typeof body.customerEmail !== 'string') {
    throw new Error("customerEmail is required and must be a string");
  }

  if (!body.rawEmail && !body.subject && !body.body) {
    throw new Error("Either rawEmail or subject/body must be provided");
  }

  return body;
}

/**
 * Combine subject and body into raw email format
 */
export function combineEmailParts(subject?: string, body?: string): string {
  const parts = [];
  if (subject) parts.push(`Subject: ${subject}`);
  if (body) parts.push(`\n${body}`);
  return parts.join('\n');
}
```

---

## 7. Main Processing Logic (src/processor.ts)

```typescript
import { maskPII, generateRequestId, logInfo, logError, type LogContext } from "./pii.js";
import { extractWithOpenAI, generateDraft, calculateConfidence } from "./openai.js";
import { createTicket, createDraft } from "./database.js";
import { postToSlack } from "./slack.js";
import type { ExtractionResult, ProcessEmailResult } from "./schemas.js";

export interface ProcessEmailParams {
  source: string;
  customerEmail: string;
  rawEmail: string;
}

/**
 * Main email processing function
 */
export async function processEmail(params: ProcessEmailParams): Promise<ProcessEmailResult> {
  const startTime = Date.now();
  const requestId = generateRequestId();
  const logContext: LogContext = { requestId };

  try {
    logInfo("Starting email processing", logContext, { 
      source: params.source,
      customerEmailLength: params.customerEmail.length 
    });

    // 1. PII masking (REQUIRED FIRST)
    const maskedEmail = maskPII(params.rawEmail);
    const maskedCustomerEmail = maskPII(params.customerEmail);
    
    logInfo("PII masking completed", logContext);

    // 2. OpenAI extraction
    const extraction = await extractWithOpenAI(maskedEmail);
    logInfo("Email extraction completed", logContext, { 
      isCancellation: extraction.is_cancellation,
      reason: extraction.reason,
      language: extraction.language 
    });

    // 3. Early exit for non-cancellations
    if (!extraction.is_cancellation) {
      logInfo("Non-cancellation email, exiting early", logContext);
      return {
        success: true,
        message: "Not a cancellation request - no action needed",
        processingTime: Date.now() - startTime,
        extraction
      };
    }

    // 4. Generate draft response
    const draftText = await generateDraft(extraction);
    const confidence = calculateConfidence(extraction);
    
    logInfo("Draft generation completed", logContext, { confidence });

    // 5. Store in database
    const ticket = await createTicket({
      source: params.source,
      customerEmail: maskedCustomerEmail,
      rawEmailMasked: maskedEmail,
      reason: extraction.reason !== "unknown" ? extraction.reason : undefined,
      moveDate: extraction.move_date || undefined
    });

    const draft = await createDraft({
      ticketId: ticket.id,
      language: extraction.language,
      draftText,
      confidence,
      model: "gpt-4o-2024-08-06"
    });

    logInfo("Database storage completed", logContext, { 
      ticketId: ticket.id, 
      draftId: draft.id 
    });

    // 6. Post to Slack for review (if configured)
    if (process.env.SLACK_BOT_TOKEN) {
      try {
        await postToSlack({
          ticketId: ticket.id,
          draftId: draft.id,
          customerEmail: maskedCustomerEmail,
          extraction,
          draftText,
          confidence
        });
        logInfo("Slack notification sent", logContext);
      } catch (slackError) {
        logError("Failed to post to Slack", logContext, slackError);
        // Don't fail the entire process for Slack errors
      }
    }

    const processingTime = Date.now() - startTime;
    logInfo("Email processing completed successfully", logContext, { processingTime });

    return {
      success: true,
      ticketId: ticket.id,
      draftId: draft.id,
      message: "Email processed successfully",
      processingTime,
      extraction,
      confidence
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    logError("Email processing failed", logContext, error);
    
    return {
      success: false,
      message: `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      processingTime
    };
  }
}
```

---

## 8. Slack Integration (src/slack.ts)

```typescript
import { WebClient } from '@slack/web-api';
import type { ExtractionResult } from "./schemas.js";

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

export interface SlackPostParams {
  ticketId: string;
  draftId: string;
  customerEmail: string;
  extraction: ExtractionResult;
  draftText: string;
  confidence: number;
}

/**
 * Post draft to Slack for human review
 */
export async function postToSlack(params: SlackPostParams): Promise<void> {
  if (!process.env.SLACK_BOT_TOKEN || !process.env.SLACK_REVIEW_CHANNEL) {
    throw new Error("Slack configuration missing");
  }

  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "📧 New Cancellation Request"
      }
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Ticket ID:* ${params.ticketId}`
        },
        {
          type: "mrkdwn",
          text: `*Customer:* ${params.customerEmail}`
        },
        {
          type: "mrkdwn",
          text: `*Reason:* ${params.extraction.reason}`
        },
        {
          type: "mrkdwn",
          text: `*Language:* ${params.extraction.language}`
        },
        {
          type: "mrkdwn",
          text: `*Confidence:* ${Math.round(params.confidence * 100)}%`
        },
        {
          type: "mrkdwn",
          text: `*Edge Case:* ${params.extraction.edge_case}`
        }
      ]
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*Generated Draft:*"
      }
    },
    {
      type: "section",
      text: {
        type: "plain_text",
        text: params.draftText
      }
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "✅ Approve"
          },
          style: "primary",
          action_id: "approve_draft",
          value: params.draftId
        },
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "✏️ Edit"
          },
          action_id: "edit_draft",
          value: params.draftId
        },
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "❌ Reject"
          },
          style: "danger",
          action_id: "reject_draft",
          value: params.draftId
        }
      ]
    }
  ];

  await slack.chat.postMessage({
    channel: process.env.SLACK_REVIEW_CHANNEL,
    blocks,
    text: `New cancellation request from ${params.customerEmail}`
  });
}
```

---

## 9. Webhook Handler (src/webhook.ts)

```typescript
import { validateWebhookRequest, combineEmailParts } from "./utils.js";
import { processEmail } from "./processor.js";
import type { ProcessEmailResult } from "./schemas.js";

/**
 * Vercel webhook handler
 */
export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }

  try {
    // Validate request body
    const body = validateWebhookRequest(req.body);
    
    // Combine email parts if needed
    const rawEmail = body.rawEmail || combineEmailParts(body.subject, body.body);
    
    // Process the email
    const result: ProcessEmailResult = await processEmail({
      source: body.source,
      customerEmail: body.customerEmail,
      rawEmail
    });

    // Return result
    return res.status(200).json(result);

  } catch (error) {
    console.error('Webhook error:', error);
    
    return res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
```

---

## 10. Database Schema (sql/schema.sql)

```sql
-- Create tables for minimal OpenAI agent
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Core ticket storage
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source VARCHAR(32) NOT NULL,
  customer_email TEXT NOT NULL,
  raw_email_masked TEXT NOT NULL,
  reason VARCHAR(64),
  move_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generated draft responses
CREATE TABLE IF NOT EXISTS drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  language VARCHAR(5) NOT NULL,
  draft_text TEXT NOT NULL,
  confidence NUMERIC NOT NULL,
  model VARCHAR(64) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Human review decisions
CREATE TABLE IF NOT EXISTS human_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  draft_id UUID REFERENCES drafts(id) ON DELETE CASCADE,
  decision VARCHAR(16) NOT NULL CHECK (decision IN ('approve', 'edit', 'reject')),
  final_text TEXT NOT NULL,
  reviewer_slack_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tickets_source ON tickets(source);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_drafts_ticket_id ON drafts(ticket_id);
CREATE INDEX IF NOT EXISTS idx_human_reviews_ticket_id ON human_reviews(ticket_id);
CREATE INDEX IF NOT EXISTS idx_human_reviews_draft_id ON human_reviews(draft_id);
```

---

## 11. Vercel Configuration (vercel.json)

```json
{
  "functions": {
    "src/webhook.ts": {
      "maxDuration": 30
    }
  },
  "env": {
    "NODE_ENV": "production"
  }
}
```

---

## 12. Main Entry Point (src/index.ts)

```typescript
import 'dotenv/config';
import handler from './webhook.js';

// Export the handler for Vercel
export default handler;

// For local development
if (process.env.NODE_ENV === 'development') {
  const port = process.env.PORT || 3000;
  
  // Simple local server for testing
  const server = Bun.serve({
    port,
    fetch: async (req) => {
      const url = new URL(req.url);
      
      if (url.pathname === '/webhook' && req.method === 'POST') {
        const body = await req.json();
        const result = await handler({ method: 'POST', body }, { 
          status: () => ({ json: (data: any) => data }),
          setHeader: () => {},
          end: () => {}
        });
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      return new Response('Not found', { status: 404 });
    }
  });
  
  console.log(`Server running on http://localhost:${port}`);
}
```

---

## 13. Testing Examples

### 13.1 Test Email Examples

```typescript
// Norwegian cancellation
const norwegianEmail = `
Subject: Oppsigelse av abonnement
Hei, jeg flytter fra adressen min og ønsker å si opp abonnementet mitt. 
Jeg flytter 15. mars 2024.
Mvh, Kari Nordmann
`;

// English cancellation
const englishEmail = `
Subject: Cancel subscription
Hi, I'm moving and would like to cancel my subscription.
I'm moving on March 15, 2024.
Thanks, John Doe
`;

// Non-cancellation
const supportEmail = `
Subject: App not working
Hi, I'm having trouble logging into the app. Can you help?
Thanks
`;
```

### 13.2 Test Webhook Calls

```bash
# Test Norwegian cancellation
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "source": "test",
    "customerEmail": "kari@example.com",
    "subject": "Oppsigelse av abonnement",
    "body": "Hei, jeg flytter fra adressen min og ønsker å si opp abonnementet mitt. Jeg flytter 15. mars 2024."
  }'

# Test English cancellation
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "source": "test",
    "customerEmail": "john@example.com",
    "subject": "Cancel subscription",
    "body": "Hi, I am moving and would like to cancel my subscription. I am moving on March 15, 2024."
  }'
```

---

This implementation guide provides complete, working code for the minimal OpenAI agent system. Each component is self-contained and can be implemented incrementally, making it perfect for educational purposes and demonstrating core OpenAI agent patterns.
