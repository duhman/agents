/**
 * Streaming Extraction API Endpoint
 * 
 * Server-Sent Events (SSE) endpoint for real-time extraction updates
 * Provides progressive feedback as extraction happens
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateRequestId, logInfo, logError, type LogContext } from '@agents/core';
import { createSSEStream } from '../apps/agent/src/streaming-processor.js';

export const config = {
  runtime: 'nodejs',
  regions: ['iad1'],
  maxDuration: 30,
};

interface WebhookPayload {
  source?: string;
  customerEmail?: string;
  subject?: string;
  body?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = generateRequestId();
  const logContext: LogContext = { requestId };
  
  if (req.method !== 'POST') {
    logError("Invalid HTTP method", logContext, new Error(`Method ${req.method} not allowed`));
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    logInfo("Streaming extraction request received", logContext);
    
    const rawBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {};
    const body = (rawBody ?? {}) as WebhookPayload;
    
    const source = typeof body.source === 'string' && body.source ? body.source : 'hubspot';
    const customerEmail = typeof body.customerEmail === 'string' && body.customerEmail
      ? body.customerEmail
      : 'masked@example.com';
    const subject = typeof body.subject === 'string' ? body.subject : '';
    const bodyText = typeof body.body === 'string' ? body.body : '';
    
    if (!subject && !bodyText) {
      logError("Validation error", logContext, new Error("Subject and body are required"));
      return res.status(400).json({
        error: 'validation: subject and body are required',
        request_id: requestId
      });
    }
    
    const rawEmail = subject ? `Subject: ${subject}\n\n${bodyText}` : bodyText;
    
    logInfo("Starting SSE stream", logContext, {
      source,
      subjectLength: subject.length,
      bodyLength: bodyText.length,
    });
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    
    const stream = createSSEStream({
      source,
      customerEmail,
      rawEmail,
    });
    
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          logInfo("SSE stream completed", logContext);
          break;
        }
        
        const chunk = decoder.decode(value, { stream: true });
        res.write(chunk);
      }
    } finally {
      reader.releaseLock();
    }
    
    res.end();
    
  } catch (error: any) {
    logError("Streaming extraction failed", logContext, error);
    
    try {
      const errorData = JSON.stringify({
        error: error.message || 'Internal server error',
        request_id: requestId
      });
      res.write(`data: ${errorData}\n\n`);
    } catch (writeError) {
      logError("Failed to write error to stream", logContext, writeError);
    }
    
    res.end();
  }
}
