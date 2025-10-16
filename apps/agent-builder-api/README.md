# Agent Builder API

Backend API server for the visual agent builder, providing workflow management, execution engine, and MCP server integration.

## Overview

The Agent Builder API is a Fastify-based server that handles workflow CRUD operations, executes workflows using the OpenAI Agent SDK, and integrates with MCP servers for external tool access.

## Features

🚀 **Workflow Management**
- Create, read, update, and delete workflows
- Store workflow definitions with nodes and edges
- Manage workflow metadata and configuration

⚡ **Execution Engine**
- Node-based workflow interpreter
- OpenAI Agent SDK integration with full configuration support
- MCP tool calling framework
- State management and context variables
- Execution trace tracking
- Error handling and logging

🔌 **MCP Integration**
- List available MCP servers
- Discover tools from each server
- Execute MCP tools with parameter validation
- Support for multiple MCP servers (context7, hubspot, slack, linear, neon, notion, figma, supabase, vercel, deepwiki)

👥 **Human-in-the-Loop**
- Slack approval workflow integration
- Trigger configuration for webhooks and schedules
- Approval state management

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm package manager
- PostgreSQL database (via Docker in `infra/`)
- OpenAI API key
- (Optional) Slack bot token for approval workflows

### Installation

```bash
cd apps/agent-builder-api
pnpm install
```

### Environment Variables

Create a `.env` file:

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/agents

# OpenAI
OPENAI_API_KEY=sk-...

# Slack (optional for approval workflows)
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
SLACK_REVIEW_CHANNEL=C01234ABCDE

# Server
PORT=3001
NODE_ENV=development
```

### Database Setup

Initialize the database schema:

```bash
cd ../../packages/db
pnpm drizzle-kit push
```

### Development

```bash
pnpm dev
```

This starts the Fastify server at http://localhost:3001

### Build

```bash
pnpm build
```

### Production

```bash
pnpm start
```

## API Endpoints

### Workflows

#### Create Workflow
```http
POST /api/workflows
Content-Type: application/json

{
  "name": "Email Response Agent",
  "description": "Processes customer emails",
  "nodes": [...],
  "edges": [...],
  "configuration": {}
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "Email Response Agent",
  "nodes": [...],
  "edges": [...],
  "status": "draft",
  "created_at": "2025-01-16T12:00:00Z",
  "updated_at": "2025-01-16T12:00:00Z"
}
```

#### List Workflows
```http
GET /api/workflows
```

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Email Response Agent",
    "status": "active",
    "created_at": "2025-01-16T12:00:00Z"
  }
]
```

#### Get Workflow
```http
GET /api/workflows/:id
```

#### Update Workflow
```http
PUT /api/workflows/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "nodes": [...],
  "edges": [...]
}
```

#### Delete Workflow
```http
DELETE /api/workflows/:id
```

### Executions

#### Execute Workflow
```http
POST /api/workflows/:id/execute
Content-Type: application/json

{
  "input": {
    "email": "customer@example.com",
    "message": "I need help"
  }
}
```

**Response:**
```json
{
  "executionId": "uuid",
  "status": "running",
  "startTime": "2025-01-16T12:00:00Z"
}
```

#### Get Execution
```http
GET /api/executions/:id
```

**Response:**
```json
{
  "id": "uuid",
  "workflowId": "uuid",
  "status": "completed",
  "startTime": "2025-01-16T12:00:00Z",
  "endTime": "2025-01-16T12:00:05Z",
  "executionTrace": [
    {
      "nodeId": "node-1",
      "type": "trigger",
      "status": "success",
      "input": {...},
      "output": {...},
      "timestamp": "2025-01-16T12:00:00Z"
    },
    {
      "nodeId": "node-2",
      "type": "openai_agent",
      "status": "success",
      "input": {...},
      "output": {...},
      "timestamp": "2025-01-16T12:00:03Z"
    }
  ]
}
```

#### List Executions
```http
GET /api/executions?workflowId=uuid&limit=10
```

### MCP Integration

#### List MCP Servers
```http
GET /api/mcp/servers
```

**Response:**
```json
[
  "context7",
  "hubspot",
  "slack",
  "linear",
  "neon",
  "notion",
  "figma",
  "supabase",
  "vercel",
  "deepwiki"
]
```

#### List Server Tools
```http
GET /api/mcp/servers/:server/tools
```

**Response:**
```json
[
  {
    "name": "get_contact",
    "description": "Retrieve contact information",
    "parameters": {
      "type": "object",
      "properties": {
        "email": {
          "type": "string",
          "description": "Contact email"
        }
      },
      "required": ["email"]
    }
  }
]
```

#### Execute MCP Tool
```http
POST /api/mcp/servers/:server/tools/:tool
Content-Type: application/json

{
  "parameters": {
    "email": "customer@example.com"
  }
}
```

### Triggers

#### Create Trigger
```http
POST /api/triggers
Content-Type: application/json

{
  "workflowId": "uuid",
  "type": "webhook",
  "configuration": {
    "path": "/webhooks/custom"
  }
}
```

#### List Triggers
```http
GET /api/triggers?workflowId=uuid
```

### Approvals

#### List Pending Approvals
```http
GET /api/approvals?status=pending
```

#### Approve
```http
POST /api/approvals/:id/approve
Content-Type: application/json

{
  "finalText": "Approved response text"
}
```

#### Reject
```http
POST /api/approvals/:id/reject
Content-Type: application/json

{
  "reason": "Does not meet policy requirements"
}
```

## Architecture

### Execution Engine

The execution engine (`src/execution-engine.ts`) processes workflows node by node:

1. **Start with trigger node** - Extract input data
2. **Follow edges** - Traverse workflow graph
3. **Execute each node** - Based on node type
4. **Manage context** - Pass data between nodes
5. **Track execution** - Record trace for monitoring
6. **Handle errors** - Graceful failure with detailed logging

### Node Type Handlers

#### Trigger Node
```typescript
async executeTrigger(node, context) {
  return {
    ...context.input
  };
}
```

#### OpenAI Agent Node
```typescript
async executeOpenAIAgent(node, context) {
  const agent = new Agent({
    name: agentConfig.name,
    instructions: agentConfig.instructions,
    model: agentConfig.model || 'gpt-4o-2024-08-06',
    modelSettings: {
      temperature: agentConfig.temperature ?? 0,
      maxTokens: agentConfig.maxTokens,
      topP: agentConfig.topP
    }
  });
  
  // Currently returns placeholder (full execution pending)
  return {
    agent: agentConfig.name,
    output: 'Agent execution completed',
    model: agentConfig.model
  };
}
```

#### MCP Tool Node
```typescript
async executeMCPTool(node, context) {
  const client = this.getMCPClient(mcpConfig.server);
  const result = await client.executeTool(
    mcpConfig.tool,
    mcpConfig.parameters
  );
  return result;
}
```

#### Condition Node
```typescript
async executeCondition(node, context) {
  const condition = node.data.condition;
  // Evaluate JavaScript expression with context variables
  const result = evaluateCondition(condition, context);
  return {
    result,
    path: result ? 'true' : 'false'
  };
}
```

#### HTTP Request Node
```typescript
async executeHTTPRequest(node, context) {
  const response = await fetch(httpConfig.url, {
    method: httpConfig.method,
    headers: httpConfig.headers,
    body: httpConfig.body
  });
  return await response.json();
}
```

### MCP Client Management

The execution engine maintains MCP client connections:

```typescript
private getMCPClient(serverName: string): MCPClient {
  if (!this.mcpClients.has(serverName)) {
    this.mcpClients.set(serverName, new StubMCPClient(serverName));
  }
  return this.mcpClients.get(serverName)!;
}
```

**Note:** Currently uses stub client. Real MCP integration pending.

### Context Variables

Data flows through the workflow via context:

```typescript
interface ExecutionContext {
  input: any;           // Initial trigger data
  variables: {          // Variables from previous nodes
    [nodeId: string]: any;
  };
  executionId: string;  // Execution tracking ID
}
```

Access variables in expressions: `{{nodeId.output.field}}`

## Project Structure

```
apps/agent-builder-api/
├── src/
│   ├── index.ts              # Fastify server setup
│   ├── execution-engine.ts   # Workflow execution logic
│   └── types.ts              # TypeScript interfaces
├── package.json
├── tsconfig.json
└── README.md
```

## Database Schema

The API uses tables from `packages/db`:

- `agent_workflows` - Workflow definitions
- `agent_executions` - Execution history
- `agent_triggers` - Trigger configurations
- `agent_approvals` - Human review records

See `packages/db/src/schema.ts` for full schema.

## Error Handling

All endpoints return standardized error responses:

```json
{
  "error": "Workflow not found",
  "code": "WORKFLOW_NOT_FOUND",
  "statusCode": 404
}
```

Common error codes:
- `VALIDATION_ERROR` (400)
- `NOT_FOUND` (404)
- `EXECUTION_ERROR` (500)
- `MCP_ERROR` (500)

## Logging

Structured logging with request IDs:

```typescript
fastify.addHook('onRequest', async (request) => {
  request.log.info({
    requestId: request.id,
    method: request.method,
    url: request.url
  });
});
```

## Performance

- Database connection pooling (max 10 connections)
- Async execution for non-blocking operations
- Execution timeout: 30 seconds default
- Request timeout: 10 seconds

## Testing

```bash
# Run tests (when implemented)
pnpm test

# Run with coverage
pnpm test:coverage
```

## Deployment

The API can be deployed to:
- Vercel Serverless Functions
- Docker containers
- Traditional Node.js servers

For Vercel deployment, see `vercel.json` in the monorepo root.

## Current Limitations

⚠️ **Known Limitations:**

1. **OpenAI Agent Execution**: Currently returns placeholder data. Full Agent SDK execution pending implementation.
2. **MCP Integration**: Uses stub client. Real MCP server connections not yet implemented.
3. **Webhook Triggers**: URL generation and webhook endpoint handlers not yet implemented.
4. **Cron Scheduling**: Background job scheduling not yet implemented.
5. **Streaming**: Real-time execution streaming not yet implemented.

See `IMPLEMENTATION_STATUS.md` for full status and roadmap.

## Related Documentation

- [Agent Builder Design](../../AGENT_BUILDER_DESIGN.md) - Full architecture
- [Quick Start Guide](../../AGENT_BUILDER_QUICKSTART.md) - User guide
- [Implementation Status](../../IMPLEMENTATION_STATUS.md) - Current progress
- [Frontend App](../agent-builder/README.md) - UI documentation

## Contributing

When adding new node types:

1. Add handler method in `ExecutionEngine` class
2. Update `executeNode` switch statement
3. Add type definitions in `src/types.ts`
4. Update API documentation

## License

Part of the agents monorepo
