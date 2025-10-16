/**
 * Streaming Email Processor
 * 
 * Uses Vercel AI SDK's streamObject for real-time progressive extraction
 * Provides streaming updates for better UX in long-running operations
 */

import { streamObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import {
  maskPII,
  generateRequestId,
  logInfo,
  logError,
  type LogContext
} from '@agents/core';
import {
  extractionSchemaEnhanced,
  extractionPromptEnhanced,
  type ExtractionResultEnhanced
} from '@agents/prompts';

export interface StreamingProcessOptions {
  source: string;
  customerEmail: string;
  rawEmail: string;
  onProgress?: (partialExtraction: Partial<ExtractionResultEnhanced>) => void;
  onComplete?: (extraction: ExtractionResultEnhanced) => void;
  onError?: (error: Error) => void;
}

/**
 * Process email with streaming extraction
 * Returns an async generator that yields partial results as they arrive
 */
export async function* processEmailStreaming(
  options: StreamingProcessOptions
): AsyncGenerator<Partial<ExtractionResultEnhanced>, ExtractionResultEnhanced, undefined> {
  const { source, customerEmail, rawEmail, onProgress, onComplete, onError } = options;
  const requestId = generateRequestId();
  const logContext: LogContext = { requestId };
  
  try {
    logInfo("Starting streaming email processing", logContext, {
      source,
      customerEmail: maskPII(customerEmail)
    });
    
    const maskedEmail = maskPII(rawEmail);
    
    const { partialObjectStream, object: finalObject } = streamObject({
      model: openai('gpt-4o-2024-08-06'),
      schema: extractionSchemaEnhanced,
      prompt: extractionPromptEnhanced(maskedEmail),
      temperature: 0,
    });
    
    for await (const partialObject of partialObjectStream) {
      const partial = partialObject as unknown as Partial<ExtractionResultEnhanced>;
      if (onProgress) {
        onProgress(partial);
      }
      yield partial;
    }
    
    const extraction = (await finalObject) as ExtractionResultEnhanced;
    
    if (onComplete) {
      onComplete(extraction);
    }
    
    logInfo("Streaming extraction completed", logContext, {
      isCancellation: extraction.is_cancellation,
      language: extraction.language,
      edgeCase: extraction.edge_case
    });
    
    return extraction;
  } catch (error: any) {
    logError("Streaming extraction failed", logContext, error);
    
    if (onError) {
      onError(error);
    }
    
    throw error;
  }
}

/**
 * Simple wrapper for non-streaming usage
 * Buffers all partial results and returns only the final extraction
 */
export async function processEmailStreamingSimple(
  params: Pick<StreamingProcessOptions, 'source' | 'customerEmail' | 'rawEmail'>
): Promise<ExtractionResultEnhanced> {
  let finalResult: ExtractionResultEnhanced | undefined;
  
  for await (const partial of processEmailStreaming(params)) {
  }
  
  const generator = processEmailStreaming(params);
  let current = await generator.next();
  
  while (!current.done) {
    current = await generator.next();
  }
  
  return current.value;
}

/**
 * Server-Sent Events (SSE) handler for streaming to frontend
 * Use this in API routes for real-time updates to the UI
 */
export function createSSEStream(
  params: Pick<StreamingProcessOptions, 'source' | 'customerEmail' | 'rawEmail'>
) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const partialExtraction of processEmailStreaming(params)) {
          const data = JSON.stringify(partialExtraction);
          const message = `data: ${data}\n\n`;
          controller.enqueue(encoder.encode(message));
        }
        
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error: any) {
        const errorData = JSON.stringify({ error: error.message });
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
        controller.close();
      }
    },
  });
  
  return stream;
}
