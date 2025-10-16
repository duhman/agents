/**
 * React Hook for Streaming Extraction
 * 
 * Consumes the SSE streaming API and provides real-time extraction updates
 * Integrates with Vercel AI SDK patterns for optimal UX
 */

import { useState, useCallback } from 'react';

type ExtractionResultEnhanced = {
  is_cancellation: boolean;
  reason: string;
  move_date: string | null;
  language: string;
  edge_case: string;
  urgency: string;
  customer_concerns: string[];
  policy_risks: string[];
  confidence_factors: {
    clear_intent: boolean;
    complete_information: boolean;
    standard_case: boolean;
  };
  has_payment_issue?: boolean;
  payment_concerns?: string[];
};

export interface StreamingExtractionState {
  isLoading: boolean;
  error: Error | null;
  partialExtraction: Partial<ExtractionResultEnhanced> | null;
  finalExtraction: ExtractionResultEnhanced | null;
  progress: number; // 0-100
}

export interface UseStreamingExtractionOptions {
  onProgress?: (partial: Partial<ExtractionResultEnhanced>) => void;
  onComplete?: (extraction: ExtractionResultEnhanced) => void;
  onError?: (error: Error) => void;
}

export function useStreamingExtraction(options: UseStreamingExtractionOptions = {}) {
  const [state, setState] = useState<StreamingExtractionState>({
    isLoading: false,
    error: null,
    partialExtraction: null,
    finalExtraction: null,
    progress: 0,
  });
  
  const extract = useCallback(async (params: {
    source: string;
    customerEmail: string;
    subject: string;
    body: string;
  }) => {
    setState({
      isLoading: true,
      error: null,
      partialExtraction: null,
      finalExtraction: null,
      progress: 0,
    });
    
    try {
      const response = await fetch('/api/stream-extraction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      if (!response.body) {
        throw new Error('Response body is null');
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) {
            continue;
          }
          
          const data = line.slice(6); // Remove 'data: ' prefix
          
          if (data === '[DONE]') {
            setState(prev => ({
              ...prev,
              isLoading: false,
              progress: 100,
            }));
            continue;
          }
          
          try {
            const parsed = JSON.parse(data);
            
            if (parsed.error) {
              const error = new Error(parsed.error);
              setState(prev => ({
                ...prev,
                isLoading: false,
                error,
              }));
              
              if (options.onError) {
                options.onError(error);
              }
              continue;
            }
            
            const totalFields = 9; // Number of fields in extractionSchemaEnhanced
            const populatedFields = Object.keys(parsed).length;
            const progress = Math.min(95, (populatedFields / totalFields) * 100);
            
            setState(prev => ({
              ...prev,
              partialExtraction: parsed,
              progress,
            }));
            
            if (options.onProgress) {
              options.onProgress(parsed);
            }
            
            if (isCompleteExtraction(parsed)) {
              setState(prev => ({
                ...prev,
                finalExtraction: parsed as ExtractionResultEnhanced,
                progress: 100,
                isLoading: false,
              }));
              
              if (options.onComplete) {
                options.onComplete(parsed as ExtractionResultEnhanced);
              }
            }
          } catch (parseError) {
            console.error('Failed to parse SSE data:', parseError);
          }
        }
      }
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error,
      }));
      
      if (options.onError) {
        options.onError(error);
      }
    }
  }, [options]);
  
  return {
    ...state,
    extract,
  };
}

/**
 * Check if a partial extraction is complete
 */
function isCompleteExtraction(
  partial: Partial<ExtractionResultEnhanced>
): partial is ExtractionResultEnhanced {
  return (
    typeof partial.is_cancellation === 'boolean' &&
    typeof partial.reason === 'string' &&
    typeof partial.language === 'string' &&
    typeof partial.edge_case === 'string' &&
    typeof partial.urgency === 'string' &&
    Array.isArray(partial.customer_concerns) &&
    Array.isArray(partial.policy_risks) &&
    typeof partial.confidence_factors === 'object'
  );
}
