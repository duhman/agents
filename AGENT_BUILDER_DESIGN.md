# Visual Agent Builder - Design Document

## Overview

A visual, node-based agent builder that leverages OpenAI Agent SDK, MCP servers, and provides full support for continuous agent execution with human-in-the-loop via Slack integration.

## Architecture

### Core Components

1. **Frontend (React + React Flow)**
   - Visual flow editor with drag-and-drop nodes (✅ Implemented)
   - Langflow-inspired UI with gradient node styling (✅ Implemented)
   - Real-time agent execution monitoring (✅ Implemented)
   - Comprehensive configuration panels for nodes (✅ Implemented)
   - Node palette with categories and search (✅ Implemented)
   - Execution panel with expandable traces (✅ Implemented)
   - Agent template library (📋 Planned)

2. **Backend (Fastify)**
   - Agent CRUD operations (✅ Implemented)
   - Flow execution engine (✅ Implemented)
   - MCP server integration (🔄 Framework ready, real connections pending)
   - Webhook management (📋 Planned)
   - Continuous execution scheduler (📋 Planned)

3. **Database (PostgreSQL via Drizzle)**
   - Agent definitions (✅ Implemented)
   - Flow configurations (✅ Implemented)
   - Execution history (✅ Implemented)
   - Trigger configurations (✅ Implemented)

4. **Execution Engine**
   - Node-based workflow execution (✅ Implemented)
   - OpenAI Agent SDK integration (🔄 Basic implementation, full execution pending)
   - MCP tool calling (🔄 Framework ready, real connections pending)
   - Slack approval workflows (✅ Implemented)
   - Error handling and retry logic (✅ Implemented)

## Node Types

### 1. Trigger Nodes
- **Webhook Trigger**: HTTP endpoint for external events
- **Schedule Trigger**: Cron-based scheduling
- **Email Trigger**: Email-based triggers
- **Event Trigger**: Listen to custom events
- **Manual Trigger**: User-initiated execution

### 2. Action Nodes
- **OpenAI Agent**: Configure and execute OpenAI agents
- **MCP Tool Call**: Call any MCP server tool
- **HTTP Request**: Make external API calls
- **Database Query**: Execute database operations
- **Send Email**: Email notifications
- **Slack Message**: Post to Slack channels

### 3. Control Flow Nodes
- **Condition**: Branch based on conditions
- **Loop**: Iterate over collections
- **Merge**: Combine multiple paths
- **Switch**: Multiple conditional branches
- **Wait**: Delay execution

### 4. Human-in-the-Loop Nodes
- **Slack Approval**: Request approval via Slack
- **Form Input**: Collect user input
- **Review Task**: Human review with custom UI

### 5. Data Transformation Nodes
- **Transform**: Map/filter/reduce data
- **Extract**: Parse and extract data
- **Aggregate**: Combine data from multiple sources
- **Validate**: Schema validation

## Database Schema

### agent_workflows
- id (uuid)
- name (text)
- description (text)
- nodes (jsonb) - Flow node definitions
- edges (jsonb) - Flow connections
- configuration (jsonb) - Global settings
- status (enum: draft, active, paused, archived)
- created_at, updated_at

### agent_executions
- id (uuid)
- workflow_id (uuid FK)
- trigger_type (text)
- trigger_data (jsonb)
- status (enum: running, completed, failed, waiting_approval)
- start_time, end_time
- execution_trace (jsonb) - Step-by-step trace
- error (text)

### agent_triggers
- id (uuid)
- workflow_id (uuid FK)
- type (enum: webhook, schedule, email, event)
- configuration (jsonb)
- webhook_url (text) - Generated for webhook triggers
- cron_expression (text) - For schedule triggers
- enabled (boolean)
- created_at

### agent_approvals
- id (uuid)
- execution_id (uuid FK)
- node_id (text)
- slack_message_ts (text)
- slack_channel (text)
- status (enum: pending, approved, rejected)
- approver_slack_id (text)
- decision_data (jsonb)
- created_at, resolved_at

## UI Components

### Node Palette
Categorized library of available node types with:
- **Categories**: Triggers, Actions, AI, Integrations, Control Flow, Human Review, Data
- **Search functionality**: Filter nodes by name or description
- **Node previews**: Icons, names, and descriptions for each type
- **Drag-and-drop**: Drag nodes from palette to canvas

### Node Configuration Panel
Comprehensive sidebar for editing selected nodes:
- **Dynamic fields**: Adapts based on node type
- **OpenAI Agent settings**: Name, model selection, instructions, temperature, maxTokens, topP
- **MCP integration**: Server dropdown, tool selection, parameter configuration
- **Condition editing**: JavaScript expression support with variable syntax hints
- **Slack configuration**: Channel selection for approval nodes
- **Validation**: Real-time input validation with error messages

### Execution Panel
Real-time workflow execution monitoring with:
- **Execution status**: Running, Completed, Failed indicators
- **Expandable trace**: Step-by-step execution details
- **Node status badges**: Success/Error/Pending indicators for each step
- **Input/Output display**: JSON view of data flowing through nodes
- **Error details**: Stack traces and error messages for debugging
- **Timestamps**: Duration tracking for performance analysis

### Workflow Toolbar
Top navigation and controls:
- **Branding**: "Agent Builder" title with gradient styling
- **Workflow naming**: Inline editable workflow name
- **Action buttons**: Save, Execute, Clear Canvas
- **Status indicators**: Save state, execution state

### Custom Node Types
Visually distinct nodes with gradient styling:
- **TriggerNode**: Green gradient (bg-gradient-to-br from-green-50 to-green-100)
- **OpenAIAgentNode**: Cyan gradient with bot icon
- **MCPToolNode**: Pink gradient with plugin icon
- **ActionNode**: Blue gradient with zap icon
- **ConditionNode**: Amber gradient with dual outputs (true/false paths)
- **ApprovalNode**: Purple gradient with user-check icon
- All nodes feature: shadow effects, rounded borders, handle indicators, selected state highlighting

## Features

### 1. Visual Flow Editor
- Drag-and-drop interface
- Real-time validation
- Auto-layout and organization
- Undo/redo support
- Copy/paste nodes
- Template library

### 2. OpenAI Agent Integration
- Full OpenAI Agent SDK support
- Configure agents with tools
- Multi-agent handoffs
- Structured outputs with Zod
- Temperature and model settings
- Token usage tracking

### 3. MCP Server Support
- Discover available MCP servers
- Browse tools from each server
- Configure tool parameters
- Execute MCP tools in workflows
- Handle OAuth authentication

### 4. Continuous Execution
- Background job processing
- Cron-based scheduling
- Event-driven triggers
- Retry logic with backoff
- Execution history and logs

### 5. Human-in-the-Loop
- Slack approval nodes
- Custom approval UI
- Timeout handling
- Approval history
- Escalation logic

### 6. Monitoring & Debugging
- Real-time execution traces
- Node-level logging
- Error tracking
- Performance metrics
- Execution replay

## API Endpoints

### Workflows
- `POST /api/workflows` - Create workflow
- `GET /api/workflows` - List workflows
- `GET /api/workflows/:id` - Get workflow
- `PUT /api/workflows/:id` - Update workflow
- `DELETE /api/workflows/:id` - Delete workflow
- `POST /api/workflows/:id/activate` - Activate workflow
- `POST /api/workflows/:id/pause` - Pause workflow

### Executions
- `POST /api/workflows/:id/execute` - Manual execution
- `GET /api/executions` - List executions
- `GET /api/executions/:id` - Get execution details
- `POST /api/executions/:id/cancel` - Cancel execution
- `GET /api/executions/:id/trace` - Get execution trace

### Triggers
- `POST /api/triggers` - Create trigger
- `GET /api/triggers` - List triggers
- `PUT /api/triggers/:id` - Update trigger
- `DELETE /api/triggers/:id` - Delete trigger
- `POST /webhook/:trigger_id` - Webhook endpoint

### MCP Integration
- `GET /api/mcp/servers` - List MCP servers
- `GET /api/mcp/servers/:server/tools` - List server tools
- `POST /api/mcp/servers/:server/tools/:tool` - Execute tool

### Approvals
- `GET /api/approvals` - List pending approvals
- `POST /api/approvals/:id/approve` - Approve
- `POST /api/approvals/:id/reject` - Reject

## Technology Stack

### Frontend
- React 18
- React Flow (node-based UI)
- Tailwind CSS
- shadcn/ui components
- Zod for validation
- React Query for data fetching
- Zustand for state management

### Backend
- Node.js 20
- Fastify (high-performance)
- Drizzle ORM
- PostgreSQL
- Bull (job queue)
- OpenAI Agent SDK
- Slack Bolt

### Deployment
- Frontend: Vercel
- Backend: Vercel Serverless Functions
- Database: Neon (serverless Postgres)
- Job Queue: Upstash Redis (serverless)

## Implementation Phases

### Phase 1: Core Infrastructure
- Database schema
- Basic CRUD API
- Frontend scaffolding
- React Flow integration

### Phase 2: Node Types
- Trigger nodes
- OpenAI Agent nodes
- MCP integration nodes
- Control flow nodes

### Phase 3: Execution Engine
- Workflow execution
- State management
- Error handling
- Retry logic

### Phase 4: Human-in-the-Loop
- Slack approval nodes
- Approval UI
- Timeout handling
- Escalation

### Phase 5: Continuous Execution
- Cron scheduling
- Webhook triggers
- Event system
- Background jobs

### Phase 6: Polish & Features
- Templates library
- Import/export
- Monitoring dashboard
- Documentation

## Security Considerations

1. **API Security**
   - JWT authentication
   - API key management
   - Rate limiting
   - CORS configuration

2. **Workflow Isolation**
   - Sandboxed execution
   - Resource limits
   - Timeout enforcement
   - Cost controls

3. **Secret Management**
   - Encrypted storage
   - Environment-specific secrets
   - Rotation support
   - Audit logging

4. **MCP Security**
   - OAuth flow handling
   - Token refresh
   - Scope validation
   - Server authentication

## Integration with Existing System

The agent builder will:
1. Reuse existing database infrastructure (`@agents/db`)
2. Leverage existing Slack integration (`apps/slack-bot`)
3. Use shared utilities (`@agents/core`)
4. Follow existing architectural patterns
5. Integrate with current OpenAI agent implementations

## Success Metrics

1. **Usability**
   - Time to create first workflow: <10 minutes
   - Template usage rate: >50%
   - User satisfaction score: >4/5

2. **Performance**
   - Workflow execution time: <5s (simple flows)
   - API response time: <200ms (p95)
   - UI responsiveness: 60fps

3. **Reliability**
   - Execution success rate: >99%
   - Uptime: >99.9%
   - Error recovery rate: >95%

4. **Adoption**
   - Active workflows: 50+ within 3 months
   - Daily active users: 10+ within 3 months
   - Workflow complexity: Average 5+ nodes
