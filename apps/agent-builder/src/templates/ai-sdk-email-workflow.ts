/**
 * AI SDK Email Processing Workflow Template
 * 
 * Pre-configured workflow showing the AI SDK email processing pipeline
 */

import { Node, Edge } from 'reactflow';

export const aiSdkEmailWorkflowTemplate = {
  name: 'AI SDK Email Processing Workflow',
  description: 'Email processing workflow using Vercel AI SDK',
  nodes: [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 100, y: 50 },
      data: {
        label: 'Webhook Trigger',
        config: {
          type: 'webhook',
          path: '/api/webhook',
          method: 'POST'
        }
      }
    },
    {
      id: 'action-1',
      type: 'action',
      position: { x: 100, y: 150 },
      data: {
        label: 'PII Masking',
        config: {
          action: 'maskPII',
          description: 'Mask personally identifiable information before processing'
        }
      }
    },
    {
      id: 'action-2',
      type: 'action',
      position: { x: 100, y: 250 },
      data: {
        label: 'Deterministic Extraction',
        config: {
          action: 'extractEmailDataDeterministic',
          description: 'Fast pattern-matching extraction for standard cases'
        }
      }
    },
    {
      id: 'condition-1',
      type: 'condition',
      position: { x: 100, y: 370 },
      data: {
        label: 'Needs AI SDK?',
        config: {
          condition: 'needsAiSdk',
          description: 'Check if complex case requires AI SDK processing',
          trueLabel: 'Complex',
          falseLabel: 'Standard'
        }
      }
    },
    {
      id: 'ai-extraction',
      type: 'openai-agent',
      position: { x: 300, y: 500 },
      data: {
        label: 'AI SDK Extraction',
        config: {
          model: 'gpt-4o-2024-08-06',
          schema: 'extractionSchemaEnhanced',
          temperature: 0,
          description: 'AI SDK generateObject for complex extraction'
        }
      }
    },
    {
      id: 'condition-2',
      type: 'condition',
      position: { x: 100, y: 630 },
      data: {
        label: 'Is Cancellation?',
        config: {
          condition: 'is_cancellation',
          description: 'Check if customer is requesting cancellation',
          trueLabel: 'Yes',
          falseLabel: 'No'
        }
      }
    },
    {
      id: 'action-3',
      type: 'action',
      position: { x: 300, y: 760 },
      data: {
        label: 'Create Ticket',
        config: {
          action: 'createTicket',
          description: 'Create database record for tracking'
        }
      }
    },
    {
      id: 'action-4',
      type: 'action',
      position: { x: 300, y: 860 },
      data: {
        label: 'RAG Context Retrieval',
        config: {
          action: 'getVectorStoreContext',
          description: 'Retrieve similar cases from vector store'
        }
      }
    },
    {
      id: 'action-5',
      type: 'action',
      position: { x: 300, y: 960 },
      data: {
        label: 'Generate Draft',
        config: {
          action: 'generateDraftEnhanced',
          description: 'Generate policy-compliant response using templates'
        }
      }
    },
    {
      id: 'action-6',
      type: 'action',
      position: { x: 300, y: 1060 },
      data: {
        label: 'Validate Policy',
        config: {
          action: 'validatePolicyCompliance',
          description: 'Ensure draft follows company policies'
        }
      }
    },
    {
      id: 'action-7',
      type: 'action',
      position: { x: 300, y: 1160 },
      data: {
        label: 'Calculate Confidence',
        config: {
          action: 'calculateConfidenceEnhanced',
          description: 'Compute confidence score for human review prioritization'
        }
      }
    },
    {
      id: 'action-8',
      type: 'action',
      position: { x: 300, y: 1260 },
      data: {
        label: 'Create Draft Record',
        config: {
          action: 'createDraft',
          description: 'Save draft to database'
        }
      }
    },
    {
      id: 'approval-1',
      type: 'approval',
      position: { x: 300, y: 1380 },
      data: {
        label: 'Human Review (Slack)',
        config: {
          approvers: ['slack_hitm'],
          description: 'Post to Slack for human-in-the-middle review',
          actions: ['Approve', 'Edit', 'Reject']
        }
      }
    },
    {
      id: 'action-9',
      type: 'action',
      position: { x: 500, y: 1500 },
      data: {
        label: 'Send Email',
        config: {
          action: 'sendEmail',
          description: 'Send approved response to customer'
        }
      }
    },
    {
      id: 'action-return',
      type: 'action',
      position: { x: -100, y: 760 },
      data: {
        label: 'Return (No Action)',
        config: {
          action: 'returnEarly',
          description: 'Exit workflow early for non-cancellation requests'
        }
      }
    }
  ] as Node[],
  edges: [
    { id: 'e1-2', source: 'trigger-1', target: 'action-1', label: 'Email received' },
    { id: 'e2-3', source: 'action-1', target: 'action-2', label: 'PII masked' },
    { id: 'e3-4', source: 'action-2', target: 'condition-1', label: 'Extracted' },
    { id: 'e4a-ai', source: 'condition-1', target: 'ai-extraction', label: 'Complex', sourceHandle: 'true' },
    { id: 'e4b-c2', source: 'condition-1', target: 'condition-2', label: 'Standard', sourceHandle: 'false' },
    { id: 'eai-c2', source: 'ai-extraction', target: 'condition-2', label: 'AI extracted' },
    { id: 'ec2-t', source: 'condition-2', target: 'action-3', label: 'Cancellation', sourceHandle: 'true' },
    { id: 'ec2-r', source: 'condition-2', target: 'action-return', label: 'Not cancellation', sourceHandle: 'false' },
    { id: 'e5-6', source: 'action-3', target: 'action-4', label: 'Ticket created' },
    { id: 'e6-7', source: 'action-4', target: 'action-5', label: 'Context retrieved' },
    { id: 'e7-8', source: 'action-5', target: 'action-6', label: 'Draft generated' },
    { id: 'e8-9', source: 'action-6', target: 'action-7', label: 'Validated' },
    { id: 'e9-10', source: 'action-7', target: 'action-8', label: 'Confidence calculated' },
    { id: 'e10-11', source: 'action-8', target: 'approval-1', label: 'Draft saved' },
    { id: 'e11-12', source: 'approval-1', target: 'action-9', label: 'Approved', sourceHandle: 'approve' }
  ] as Edge[]
};

export const defaultWorkflowTemplates = [
  aiSdkEmailWorkflowTemplate
];
