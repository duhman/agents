/**
 * Streaming Extraction Demo Component
 * 
 * Demonstrates real-time extraction with progressive UI updates
 * Shows best practices for using AI SDK streaming in React
 */

import { useState } from 'react';
import { useStreamingExtraction } from '../hooks/useStreamingExtraction';

export function StreamingExtractionDemo() {
  const [emailInput, setEmailInput] = useState({
    source: 'demo',
    customerEmail: 'customer@example.com',
    subject: 'Cancellation Request',
    body: 'Hei, jeg skal flytte til Oslo 15. mars og vil si opp abonnementet mitt.',
  });
  
  const { 
    isLoading, 
    error, 
    partialExtraction, 
    finalExtraction, 
    progress, 
    extract 
  } = useStreamingExtraction({
    onProgress: (partial) => {
      console.log('Progress update:', partial);
    },
    onComplete: (extraction) => {
      console.log('Extraction complete:', extraction);
    },
    onError: (error) => {
      console.error('Extraction error:', error);
    },
  });
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await extract(emailInput);
  };
  
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4">Streaming Extraction Demo</h1>
        <p className="text-gray-600 mb-6">
          Watch as the AI extracts information from the email in real-time
        </p>
        
        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject
            </label>
            <input
              type="text"
              value={emailInput.subject}
              onChange={(e) => setEmailInput(prev => ({ ...prev, subject: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Email subject..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Body
            </label>
            <textarea
              value={emailInput.body}
              onChange={(e) => setEmailInput(prev => ({ ...prev, body: e.target.value }))}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Email body..."
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            {isLoading ? 'Extracting...' : 'Extract Information'}
          </button>
        </form>
      </div>
      
      {/* Progress Bar */}
      {isLoading && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-2 flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm font-medium text-blue-600">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Partial Results (Real-time Updates) */}
      {partialExtraction && !finalExtraction && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <span className="mr-2">📊</span>
            Extracting... (Partial Results)
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <ExtractionField
              label="Is Cancellation"
              value={partialExtraction.is_cancellation}
              isComplete={typeof partialExtraction.is_cancellation === 'boolean'}
            />
            <ExtractionField
              label="Language"
              value={partialExtraction.language}
              isComplete={!!partialExtraction.language}
            />
            <ExtractionField
              label="Reason"
              value={partialExtraction.reason}
              isComplete={!!partialExtraction.reason}
            />
            <ExtractionField
              label="Move Date"
              value={partialExtraction.move_date || 'Not mentioned'}
              isComplete={typeof partialExtraction.move_date === 'string'}
            />
            <ExtractionField
              label="Edge Case"
              value={partialExtraction.edge_case}
              isComplete={!!partialExtraction.edge_case}
            />
            <ExtractionField
              label="Urgency"
              value={partialExtraction.urgency}
              isComplete={!!partialExtraction.urgency}
            />
          </div>
        </div>
      )}
      
      {/* Final Results */}
      {finalExtraction && (
        <div className="bg-green-50 rounded-lg shadow-lg p-6 border-2 border-green-200">
          <h2 className="text-xl font-bold mb-4 flex items-center text-green-800">
            <span className="mr-2">✅</span>
            Extraction Complete
          </h2>
          <div className="space-y-3">
            <ResultItem label="Is Cancellation" value={String(finalExtraction.is_cancellation)} />
            <ResultItem label="Language" value={finalExtraction.language.toUpperCase()} />
            <ResultItem label="Reason" value={finalExtraction.reason} />
            <ResultItem label="Move Date" value={finalExtraction.move_date || 'Not mentioned'} />
            <ResultItem label="Edge Case" value={finalExtraction.edge_case} />
            <ResultItem label="Urgency" value={finalExtraction.urgency} />
            <ResultItem 
              label="Customer Concerns" 
              value={finalExtraction.customer_concerns.length > 0 
                ? finalExtraction.customer_concerns.join(', ') 
                : 'None'
              } 
            />
            <ResultItem 
              label="Policy Risks" 
              value={finalExtraction.policy_risks.length > 0 
                ? finalExtraction.policy_risks.join(', ') 
                : 'None'
              } 
            />
            
            <div className="pt-3 border-t border-green-200">
              <h3 className="font-medium text-green-800 mb-2">Confidence Factors</h3>
              <div className="grid grid-cols-3 gap-2">
                <ConfidenceBadge 
                  label="Clear Intent" 
                  value={finalExtraction.confidence_factors.clear_intent} 
                />
                <ConfidenceBadge 
                  label="Complete Info" 
                  value={finalExtraction.confidence_factors.complete_information} 
                />
                <ConfidenceBadge 
                  label="Standard Case" 
                  value={finalExtraction.confidence_factors.standard_case} 
                />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 rounded-lg shadow-lg p-6 border-2 border-red-200">
          <h2 className="text-xl font-bold mb-2 flex items-center text-red-800">
            <span className="mr-2">❌</span>
            Error
          </h2>
          <p className="text-red-700">{error.message}</p>
        </div>
      )}
    </div>
  );
}


function ExtractionField({ 
  label, 
  value, 
  isComplete 
}: { 
  label: string; 
  value: any; 
  isComplete: boolean;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <div className="flex justify-between items-start mb-1">
        <span className="text-xs font-medium text-gray-500 uppercase">{label}</span>
        {isComplete ? (
          <span className="text-green-500 text-xs">✓</span>
        ) : (
          <span className="text-gray-400 text-xs animate-pulse">...</span>
        )}
      </div>
      <div className={`text-sm ${isComplete ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
        {value !== undefined && value !== null ? String(value) : '...'}
      </div>
    </div>
  );
}

function ResultItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="font-medium text-gray-700">{label}:</span>
      <span className="text-gray-900">{value}</span>
    </div>
  );
}

function ConfidenceBadge({ label, value }: { label: string; value: boolean }) {
  return (
    <div className={`px-2 py-1 rounded text-xs font-medium text-center ${
      value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
    }`}>
      {label}: {value ? '✓' : '×'}
    </div>
  );
}
