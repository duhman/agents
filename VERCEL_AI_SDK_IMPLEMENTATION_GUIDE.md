# Vercel AI SDK Implementation Guide

## Overview

This guide covers the modern Vercel AI SDK v5.0+ implementations added to the codebase. These improvements follow the latest best practices from the official Vercel AI SDK documentation and provide production-ready patterns for AI-powered workflows.

## What's New

### 1. Native AI SDK Tools (tools-v2.ts)

**Location:** `packages/agents-runtime/src/tools-v2.ts`

Modern tool definitions using the AI SDK's native `tool()` function with automatic validation and type safety.

**Available Tools:**
- `maskPIITool` - Privacy-compliant PII masking
- `createTicketTool` - Database ticket creation
- `generateDraftTool` - Policy-compliant draft generation
- `calculateConfidenceTool` - Multi-factor confidence scoring
- `saveDraftTool` - Draft persistence

**Usage Example:**

```typescript
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { allTools } from '@agents/agents-runtime/tools-v2';

const result = await generateText({
  model: openai('gpt-4o'),
  tools: allTools,
  prompt: 'Process this cancellation email and create a draft response...',
  maxSteps: 5, // Allow multiple tool calls
});

console.log(result.text);
console.log(result.toolCalls); // All tools called
console.log(result.toolResults); // Results from each tool
```

**Benefits:**
- ✅ Type-safe parameters with Zod validation
- ✅ Automatic error handling
- ✅ Built-in descriptions for LLM understanding
- ✅ Easy to test in isolation
- ✅ No deprecated Proxy patterns

### 2. Streaming Extraction (streaming-processor.ts)

**Location:** `apps/agent/src/streaming-processor.ts`

Real-time extraction with progressive updates using `streamObject`.

**Features:**
- Async generator interface for maximum flexibility
- Simple wrapper for non-streaming usage
- SSE (Server-Sent Events) stream creator
- Progress callbacks for UX integration

**Usage Example:**

```typescript
import { processEmailStreaming } from './streaming-processor';

// Async generator usage (full control)
for await (const partial of processEmailStreaming({
  source: 'hubspot',
  customerEmail: 'customer@example.com',
  rawEmail: emailText,
  onProgress: (partial) => {
    console.log('Progress:', partial);
  },
  onComplete: (final) => {
    console.log('Complete:', final);
  },
})) {
  // Handle each partial update
  updateUI(partial);
}

// Simple usage (buffer until complete)
const extraction = await processEmailStreamingSimple({
  source: 'hubspot',
  customerEmail: 'customer@example.com',
  rawEmail: emailText,
});
```

**Benefits:**
- ✅ Real-time user feedback
- ✅ Better perceived performance
- ✅ Progressive loading UX
- ✅ Early cancellation support

### 3. Streaming API Endpoint (api/stream-extraction.ts)

**Location:** `api/stream-extraction.ts`

Server-Sent Events endpoint for real-time extraction updates.

**Request Format:**

```bash
POST /api/stream-extraction
Content-Type: application/json

{
  "source": "hubspot",
  "customerEmail": "customer@example.com",
  "subject": "Cancellation Request",
  "body": "I'm moving and need to cancel..."
}
```

**Response Format (SSE):**

```
data: {"is_cancellation":true}

data: {"is_cancellation":true,"language":"en"}

data: {"is_cancellation":true,"language":"en","reason":"moving"}

...

data: [DONE]
```

**Benefits:**
- ✅ Standard SSE protocol
- ✅ Works with EventSource API
- ✅ Progressive JSON updates
- ✅ Error handling with SSE events

### 4. React Streaming Hook (useStreamingExtraction.ts)

**Location:** `apps/agent-builder/src/hooks/useStreamingExtraction.ts`

React hook for consuming the streaming API with automatic state management.

**Usage Example:**

```typescript
import { useStreamingExtraction } from '../hooks/useStreamingExtraction';

function MyComponent() {
  const {
    isLoading,
    error,
    partialExtraction,
    finalExtraction,
    progress,
    extract,
  } = useStreamingExtraction({
    onProgress: (partial) => console.log('Progress:', partial),
    onComplete: (final) => console.log('Done:', final),
    onError: (err) => console.error('Error:', err),
  });
  
  const handleSubmit = () => {
    extract({
      source: 'demo',
      customerEmail: 'customer@example.com',
      subject: 'Cancellation',
      body: 'Email text...',
    });
  };
  
  return (
    <div>
      {isLoading && <ProgressBar progress={progress} />}
      {partialExtraction && <PartialResults data={partialExtraction} />}
      {finalExtraction && <FinalResults data={finalExtraction} />}
      {error && <ErrorMessage error={error} />}
    </div>
  );
}
```

**State Management:**
- `isLoading`: Boolean indicating extraction in progress
- `error`: Error object if extraction fails
- `partialExtraction`: Partial results as they arrive
- `finalExtraction`: Complete extraction when done
- `progress`: Percentage (0-100) based on fields populated

**Benefits:**
- ✅ Automatic SSE connection management
- ✅ Built-in error handling
- ✅ Progress calculation
- ✅ React-friendly state updates

### 5. Streaming Demo Component (StreamingExtractionDemo.tsx)

**Location:** `apps/agent-builder/src/components/StreamingExtractionDemo.tsx`

Complete example component demonstrating streaming extraction UI patterns.

**Features:**
- Real-time progress bar
- Partial results display with field-by-field completion indicators
- Final results with formatted output
- Error handling UI
- Interactive form for testing

**Run the Demo:**

```bash
cd apps/agent-builder
pnpm dev
# Navigate to /demo or integrate into your app
```

**Benefits:**
- ✅ Ready-to-use reference implementation
- ✅ Production-ready UI patterns
- ✅ Accessibility best practices
- ✅ Responsive design with Tailwind

## Integration Guide

### Option 1: Add Streaming to Existing Workflow

**Current Implementation:**
```typescript
// api/webhook.ts
const result = await processEmailHybrid(params);
res.json({ success: true, ticket_id: result.ticket?.id });
```

**With Streaming:**
```typescript
// api/webhook.ts
import { createSSEStream } from '../apps/agent/src/streaming-processor.js';

// For streaming requests
if (req.headers.accept === 'text/event-stream') {
  const stream = createSSEStream(params);
  res.setHeader('Content-Type', 'text/event-stream');
  // Pipe stream to response
  return pipeStreamToResponse(stream, res);
}

// For regular requests (backward compatible)
const result = await processEmailHybrid(params);
res.json({ success: true, ticket_id: result.ticket?.id });
```

### Option 2: Use New Tools with generateText

**Current generateObject Usage:**
```typescript
const result = await generateObject({
  model: openai('gpt-4o'),
  schema: extractionSchema,
  prompt: maskedEmail,
});
```

**With Tools (more powerful):**
```typescript
import { generateText } from 'ai';
import { allTools } from '@agents/agents-runtime/tools-v2';

const result = await generateText({
  model: openai('gpt-4o'),
  tools: allTools,
  system: 'You are an email classifier. Use tools to process emails.',
  prompt: `Process this email: ${maskedEmail}`,
  maxSteps: 10, // Allow agent to use multiple tools
});

// Agent automatically decides which tools to use
console.log(result.toolCalls); // See which tools were called
console.log(result.toolResults); // See tool outputs
```

### Option 3: Progressive UI Updates

**Basic Approach:**
```typescript
// Before: Single result after completion
const result = await extractEmailData(email);
setExtraction(result);
```

**Streaming Approach:**
```typescript
// Now: Progressive updates
const { extract, partialExtraction, finalExtraction } = useStreamingExtraction();

await extract({ source, customerEmail, subject, body });

// UI updates automatically as partialExtraction changes
// Final result available in finalExtraction
```

## Testing

### Unit Tests for Tools

```typescript
// packages/agents-runtime/src/tools-v2.test.ts
import { describe, it, expect } from 'vitest';
import { maskPIITool, createTicketTool } from './tools-v2';

describe('maskPIITool', () => {
  it('should mask email addresses', async () => {
    const result = await maskPIITool.execute({
      text: 'Contact me at john@example.com',
    });
    
    expect(result.maskedText).toBe('Contact me at [email]');
    expect(result.piiDetected).toBe(true);
  });
});

describe('createTicketTool', () => {
  it('should create ticket with valid parameters', async () => {
    const result = await createTicketTool.execute({
      source: 'test',
      customerEmail: '[email]',
      rawEmailMasked: 'Masked email content',
      reason: 'moving',
    });
    
    expect(result.success).toBe(true);
    expect(result.ticketId).toBeDefined();
  });
});
```

### Integration Tests for Streaming

```typescript
// apps/agent/src/streaming-processor.test.ts
import { describe, it, expect } from 'vitest';
import { processEmailStreaming } from './streaming-processor';

describe('streaming extraction', () => {
  it('should yield partial results', async () => {
    const partials: any[] = [];
    
    for await (const partial of processEmailStreaming({
      source: 'test',
      customerEmail: 'test@example.com',
      rawEmail: 'Hei, jeg skal flytte.',
    })) {
      partials.push(partial);
    }
    
    expect(partials.length).toBeGreaterThan(0);
    expect(partials[0]).toHaveProperty('is_cancellation');
  });
});
```

### E2E Tests for Streaming API

```bash
# Test SSE endpoint
curl -N -H "Accept: text/event-stream" \
  -H "Content-Type: application/json" \
  -d '{"source":"test","customerEmail":"test@example.com","subject":"Cancel","body":"I want to cancel"}' \
  http://localhost:3000/api/stream-extraction
```

## Performance Considerations

### Streaming vs Non-Streaming

| Aspect | Non-Streaming | Streaming |
|--------|---------------|-----------|
| **Time to First Byte** | 2-3s | 200-500ms |
| **Perceived Performance** | Poor | Excellent |
| **Total Time** | 2-3s | 2-3s |
| **User Experience** | Waiting spinner | Progressive updates |
| **Cancellation** | Hard to implement | Built-in |

### When to Use Streaming

✅ **Use Streaming When:**
- User needs immediate feedback
- Long-running operations (>1s)
- Progressive results are meaningful
- User might want to cancel early

❌ **Don't Use Streaming When:**
- Operations are very fast (<500ms)
- Results must be atomic
- Client doesn't support SSE
- Batch processing scenarios

## Migration Checklist

### Phase 1: Add Tools
- [ ] Install dependencies (already installed)
- [ ] Import tools-v2 in relevant files
- [ ] Replace deprecated tool calls
- [ ] Update tests
- [ ] Deploy and monitor

### Phase 2: Add Streaming API
- [ ] Deploy stream-extraction.ts endpoint
- [ ] Test SSE connection
- [ ] Monitor error rates
- [ ] Add metrics

### Phase 3: Update Frontend
- [ ] Add useStreamingExtraction hook
- [ ] Update UI components
- [ ] Add progress indicators
- [ ] Test on various browsers

### Phase 4: Enable Streaming
- [ ] Add feature flag
- [ ] Enable for 10% of requests
- [ ] Monitor performance
- [ ] Gradual rollout to 100%

## Troubleshooting

### SSE Connection Issues

**Problem:** Stream disconnects immediately
**Solution:** Check nginx/proxy settings for buffering
```nginx
proxy_buffering off;
proxy_set_header X-Accel-Buffering no;
```

**Problem:** No updates arriving
**Solution:** Ensure response headers are set correctly
```typescript
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache, no-transform');
res.setHeader('Connection', 'keep-alive');
```

### Tool Execution Errors

**Problem:** Tool validation fails
**Solution:** Check Zod schema matches actual parameters
```typescript
// Tool definition
parameters: z.object({
  email: z.string().email(), // Must be valid email
})

// Usage
execute({ email: 'invalid' }) // ❌ Validation error
execute({ email: 'valid@example.com' }) // ✅ Works
```

## Best Practices

1. **Always Mask PII First**
   ```typescript
   const maskedEmail = maskPII(rawEmail);
   // Then process maskedEmail
   ```

2. **Use Streaming for Better UX**
   ```typescript
   // Good: Streaming with progress
   for await (const partial of processEmailStreaming(...)) {
     updateProgress(partial);
   }
   
   // Okay: Non-streaming for simple cases
   const result = await processEmailSimple(...);
   ```

3. **Handle Errors Gracefully**
   ```typescript
   const { extract } = useStreamingExtraction({
     onError: (error) => {
       toast.error(`Extraction failed: ${error.message}`);
       logError(error);
     },
   });
   ```

4. **Monitor Performance**
   ```typescript
   const start = Date.now();
   const result = await extract(...);
   logMetric('extraction_duration', Date.now() - start);
   ```

## Resources

- [Vercel AI SDK Docs](https://sdk.vercel.ai/docs)
- [AI SDK Core](https://sdk.vercel.ai/docs/ai-sdk-core/overview)
- [Generating Structured Data](https://sdk.vercel.ai/docs/ai-sdk-core/generating-structured-data)
- [Server-Sent Events Spec](https://html.spec.whatwg.org/multipage/server-sent-events.html)

## Support

For questions or issues:
1. Check the troubleshooting section above
2. Review the demo component for reference implementations
3. Consult Vercel AI SDK documentation
4. Open an issue in the repository

---

**Last Updated:** 2025-01-16  
**AI SDK Version:** 5.0.72  
**Status:** Production Ready
