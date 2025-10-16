# Minimal OpenAI Agent PRD
## Email Processing Agent for Subscription Cancellations

### Project Overview

**Goal**: Create a minimal, educational OpenAI agent system that processes customer emails for subscription cancellations using only basic OpenAI SDK TypeScript primitives.

**Purpose**: 
- Demonstrate core OpenAI agent patterns
- Provide learning material for developers
- Recreate essential functionality with minimal dependencies
- Focus on fundamentals over complexity

---

## 1. Core Requirements

### 1.1 Functional Requirements

**FR-1: Email Processing**
- Accept customer emails via webhook endpoint
- Extract structured information from emails
- Classify cancellation intent and reason
- Generate appropriate draft responses
- Store processing results in database

**FR-2: Privacy & Security**
- Mask PII (emails, phones, addresses) before any LLM calls
- Never log raw customer data
- Use environment variables for all secrets
- Validate all webhook inputs

**FR-3: Multi-language Support**
- Support Norwegian (default), English, Swedish
- Detect language from email content
- Generate responses in customer's language

**FR-4: Human-in-the-Loop**
- Post generated drafts to Slack for review
- Store human decisions (approve/edit/reject)
- Enable manual override and feedback

### 1.2 Technical Constraints

**TC-1: Minimal Dependencies**
- Use only OpenAI SDK v6.2.0+ (TypeScript)
- Use only Zod for validation
- Use only dotenv for configuration
- No Vercel AI SDK, no complex frameworks

**TC-2: Database Requirements**
- PostgreSQL with 3 core tables only
- No complex ORM - use raw SQL or simple query builder
- Support for Supabase if needed for hosting

**TC-3: Deployment**
- Vercel Functions for webhook handling
- Environment-based configuration
- <5 second function timeout compliance

---

## 2. System Architecture

### 2.1 Core Components

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Webhook       │───▶│  Email Processor │───▶│   Database      │
│   (Vercel)      │    │  (OpenAI SDK)    │    │   (PostgreSQL)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   Slack Review   │
                       │   (HITM)         │
                       └──────────────────┘
```

### 2.2 Processing Flow

1. **Webhook Reception**: Receive email via POST endpoint
2. **PII Masking**: Mask sensitive information immediately
3. **Email Extraction**: Use OpenAI to extract structured data
4. **Classification**: Determine if cancellation request
5. **Draft Generation**: Generate response if cancellation
6. **Database Storage**: Store ticket and draft
7. **Slack Notification**: Post for human review
8. **Response**: Return processing status

---

## 3. Data Models

### 3.1 Database Schema

```sql
-- Core ticket storage
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(32) NOT NULL,
  customer_email TEXT NOT NULL,
  raw_email_masked TEXT NOT NULL,
  reason VARCHAR(64),
  move_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generated draft responses
CREATE TABLE drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets(id),
  language VARCHAR(5) NOT NULL,
  draft_text TEXT NOT NULL,
  confidence NUMERIC NOT NULL,
  model VARCHAR(64) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Human review decisions
CREATE TABLE human_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets(id),
  draft_id UUID REFERENCES drafts(id),
  decision VARCHAR(16) NOT NULL, -- 'approve', 'edit', 'reject'
  final_text TEXT NOT NULL,
  reviewer_slack_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3.2 Zod Schemas

```typescript
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
  urgency: z.enum(["immediate", "future", "unclear"]).describe("Timing urgency"),
  customer_concerns: z.array(z.string()).default([]).describe("Specific customer concerns"),
  policy_risks: z.array(z.string()).default([]).describe("Policy compliance risks"),
  confidence_factors: z.object({
    clear_intent: z.boolean().describe("Intent is unambiguous"),
    complete_information: z.boolean().describe("All necessary information provided"),
    standard_case: z.boolean().describe("Falls into standard pattern")
  }).describe("Factors affecting confidence score")
});

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
```

---

## 4. API Specifications

### 4.1 Webhook Endpoint

**POST** `/api/webhook`

**Request Body:**
```typescript
{
  source: string;           // "hubspot", "email", etc.
  customerEmail: string;    // Customer's email address
  rawEmail?: string;        // Full email content (legacy)
  subject?: string;         // Email subject
  body?: string;           // Email body
}
```

**Response:**
```typescript
{
  success: boolean;
  ticketId?: string;
  draftId?: string;
  message: string;
  processingTime?: number;
}
```

### 4.2 Processing Functions

```typescript
// Main processing function
export async function processEmail(params: {
  source: string;
  customerEmail: string;
  rawEmail: string;
}): Promise<ProcessEmailResult>

// OpenAI extraction
export async function extractWithOpenAI(
  maskedEmail: string
): Promise<ExtractionResult>

// Draft generation
export async function generateDraft(
  extraction: ExtractionResult
): Promise<string>

// PII masking
export function maskPII(input: string): string
```

---

## 5. OpenAI Integration

### 5.1 Core Patterns

**Structured Output Extraction:**
```typescript
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const response = await openai.chat.completions.create({
  model: "gpt-4o-2024-08-06",
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: maskedEmail }
  ],
  response_format: zodResponseFormat(extractionSchema),
  temperature: 0
});

const extraction = response.choices[0].message.parsed;
```

**Draft Generation:**
```typescript
const response = await openai.chat.completions.create({
  model: "gpt-4o-2024-08-06",
  messages: [
    { role: "system", content: draftSystemPrompt },
    { role: "user", content: `Generate response for: ${JSON.stringify(extraction)}` }
  ],
  temperature: 0.3
});

const draft = response.choices[0].message.content;
```

### 5.2 System Prompts

**Extraction Prompt:**
```
You are Elaway's customer service AI. Analyze emails for cancellation requests.

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
```

**Draft Generation Prompt:**
```
Generate customer service response in customer's language.

REQUIREMENTS:
- 4-5 sentences, 70-100 words
- Thank customer, confirm understanding
- Provide app instructions: "Meny → Administrer abonnement → Avslutt abonnement"
- State: "Oppsigelsen gjelder ut inneværende måned"
- Offer manual help if needed

TONE: Polite, professional, empathetic
```

---

## 6. Environment Configuration

### 6.1 Required Variables

```bash
# Database
DATABASE_URL=postgres://user:password@host:5432/database

# OpenAI
OPENAI_API_KEY=sk-...

# Optional
OPENAI_VECTOR_STORE_ID=vs_...
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
SLACK_REVIEW_CHANNEL=C...
NODE_ENV=development
```

### 6.2 Security Requirements

- Never commit `.env` files
- Use Vercel environment variables for production
- Rotate API keys regularly
- Use least-privilege database access

---

## 7. File Structure

```
minimal-openai-agent/
├── package.json
├── .env.example
├── README.md
├── src/
│   ├── index.ts              # Main entry point
│   ├── schemas.ts            # Zod schemas
│   ├── openai.ts             # OpenAI integration
│   ├── database.ts           # Database operations
│   ├── pii.ts                # PII masking utilities
│   ├── webhook.ts            # Vercel webhook handler
│   └── slack.ts              # Slack integration
├── sql/
│   └── schema.sql            # Database schema
├── vercel.json               # Vercel configuration
└── docs/
    ├── API.md                # API documentation
    └── DEPLOYMENT.md         # Deployment guide
```

---

## 8. Success Criteria

### 8.1 Functional Success
- ✅ Process cancellation emails correctly
- ✅ Generate appropriate responses in customer's language
- ✅ Store all data securely with PII masking
- ✅ Enable human review via Slack
- ✅ Handle edge cases gracefully

### 8.2 Technical Success
- ✅ Use only minimal dependencies (OpenAI SDK + Zod + dotenv)
- ✅ Deploy successfully on Vercel
- ✅ Process emails in <5 seconds
- ✅ Maintain 99%+ uptime
- ✅ Zero data leaks or PII exposure

### 8.3 Educational Success
- ✅ Clear, readable code structure
- ✅ Comprehensive documentation
- ✅ Easy to understand for developers new to OpenAI
- ✅ Demonstrates core agent patterns
- ✅ Provides foundation for more complex systems

---

## 9. Implementation Phases

### Phase 1: Core Foundation (Week 1)
- Set up project structure
- Implement PII masking
- Create database schema
- Basic OpenAI integration

### Phase 2: Email Processing (Week 2)
- Implement extraction logic
- Add draft generation
- Create webhook endpoint
- Basic error handling

### Phase 3: Human Review (Week 3)
- Slack integration
- Review workflow
- Database storage
- Testing and validation

### Phase 4: Polish & Deploy (Week 4)
- Documentation
- Error handling
- Performance optimization
- Production deployment

---

## 10. Risk Mitigation

### 10.1 Technical Risks
- **OpenAI API failures**: Implement retry logic with exponential backoff
- **Database connection issues**: Use connection pooling and graceful degradation
- **Vercel timeout**: Optimize processing time, implement streaming if needed

### 10.2 Security Risks
- **PII exposure**: Mandatory masking before any LLM calls
- **API key leaks**: Environment variables only, never in code
- **Data breaches**: Encrypted database connections, minimal data retention

### 10.3 Business Risks
- **Incorrect responses**: Human review workflow for quality assurance
- **Language errors**: Comprehensive testing with real examples
- **Policy violations**: Clear prompts and validation rules

---

## 11. Future Enhancements

### 11.1 Optional Additions
- Vector store integration for context
- Advanced metrics and monitoring
- Multi-agent orchestration
- Fine-tuning with approved examples

### 11.2 Scaling Considerations
- Batch processing capabilities
- Advanced caching strategies
- Multi-region deployment
- Performance monitoring

---

This PRD provides a complete blueprint for recreating the core functionality of your email processing system with minimal dependencies and maximum educational value. The focus is on demonstrating fundamental OpenAI agent patterns while maintaining production-ready quality and security standards.
