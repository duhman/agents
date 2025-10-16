# Agent Builder - Quick Start Guide

## Overview

The Visual Agent Builder is a powerful tool for creating AI-powered workflows using OpenAI's Agent SDK, MCP servers, and human-in-the-loop approvals via Slack. Build complex agent workflows with a visual, drag-and-drop interface.

## Features

✅ **Visual Workflow Editor** - Drag-and-drop interface powered by React Flow  
✅ **OpenAI Agent Integration** - Full OpenAI Agent SDK support with tools and handoffs  
✅ **MCP Server Support** - Connect to any MCP server (HubSpot, Slack, Linear, etc.)  
✅ **Human-in-the-Loop** - Slack approval nodes for quality control  
✅ **Continuous Execution** - Webhook triggers, cron scheduling, and event-driven workflows  
✅ **Real-time Monitoring** - Track execution progress and view detailed traces  
✅ **Template Library** - Pre-built workflows to get started quickly  

## Getting Started

### 1. Start the Database

```bash
cd ~/repos/agents/infra
docker compose up -d
```

### 2. Start the Backend API

```bash
cd ~/repos/agents/apps/agent-builder-api
pnpm dev
```

The API will start on http://localhost:3001

### 3. Start the Frontend

```bash
cd ~/repos/agents/apps/agent-builder
pnpm dev
```

The UI will be available at http://localhost:5173

### 4. Create Your First Workflow

1. Open http://localhost:5173 in your browser
2. Enter a workflow name (e.g., "Email Response Agent")
3. Drag nodes from the left palette onto the canvas:
   - Start with a **Trigger** node
   - Add an **OpenAI Agent** action node
   - Connect them by dragging from the bottom of trigger to top of action
4. Click **Save** to persist your workflow
5. Click **Execute** to run it

## Node Types

### Trigger Nodes 🚀

**Webhook Trigger**
- Exposes an HTTP endpoint
- Receives JSON data from external services
- Perfect for integrations (HubSpot, Stripe, etc.)

**Schedule Trigger**
- Runs on a cron schedule
- Examples: daily reports, weekly cleanups
- Supports standard cron expressions

**Manual Trigger**
- Start workflows on-demand
- Great for testing and ad-hoc tasks

### Action Nodes ⚡

**OpenAI Agent**
- Configure agent name, model, temperature
- Add tools and capabilities
- Set up agent handoffs
- Structured outputs with Zod schemas

**MCP Tool**
- Connect to any MCP server
- Browse available tools
- Configure tool parameters
- Execute tools within workflows

**HTTP Request**
- Make external API calls
- Support for GET, POST, PUT, DELETE
- Custom headers and authentication
- Response parsing

**Transform Data**
- Map, filter, reduce operations
- Custom JavaScript transformations
- Data validation with Zod

### Control Flow Nodes 🔀

**Condition**
- If/else branching
- JavaScript expressions
- Multiple outputs (true/false)

**Loop**
- Iterate over arrays
- Execute nodes repeatedly
- Collect results

**Switch**
- Multiple conditional branches
- Pattern matching
- Default case handling

### Human-in-the-Loop Nodes ✅

**Slack Approval**
- Post to Slack channel
- Interactive buttons (Approve/Reject/Edit)
- Timeout handling
- Approval history

**Form Input**
- Custom input forms
- Field validation
- Rich text support

## Building Workflows

### Example: Email Response Agent

1. **Add Trigger Node**
   - Type: Webhook Trigger
   - Name: "Email Received"

2. **Add OpenAI Agent Node**
   - Name: "Email Classifier"
   - Instructions: "Classify incoming emails as urgent, normal, or spam"
   - Model: gpt-4o-2024-08-06
   - Temperature: 0

3. **Add Condition Node**
   - Condition: `{{classification}} === 'urgent'`

4. **Add Slack Approval Node** (for urgent emails)
   - Channel: #urgent-emails
   - Message: "Urgent email needs review: {{email_subject}}"

5. **Add OpenAI Agent Node** (for normal emails)
   - Name: "Response Generator"
   - Instructions: "Generate a helpful response to the customer email"

6. **Connect the nodes**:
   - Trigger → Email Classifier
   - Email Classifier → Condition
   - Condition (true) → Slack Approval
   - Condition (false) → Response Generator

### Example: Daily Report Generator

1. **Schedule Trigger**
   - Cron: `0 9 * * *` (9 AM daily)

2. **MCP Tool: Linear**
   - Tool: list_issues
   - Parameters: { team: "engineering", status: "in_progress" }

3. **Transform Data**
   - Group issues by assignee
   - Calculate completion percentage

4. **OpenAI Agent**
   - Generate summary report
   - Highlight blockers and risks

5. **Slack Message**
   - Post to #daily-standup
   - Include formatted report

## Using MCP Servers

### Available Servers

- **context7**: Documentation for 1000+ npm packages
- **hubspot**: CRM object management
- **slack**: Workspace and channel management
- **linear**: Issue and project tracking
- **neon**: Postgres database operations
- **notion**: Page and database management
- **figma**: Design file access
- **supabase**: Project and SQL operations

### Adding an MCP Tool Node

1. Drag **MCP Tool** node onto canvas
2. Configure:
   - Server: Select from dropdown (e.g., "hubspot")
   - Tool: Browse available tools (e.g., "get_contact")
   - Parameters: Set input values (can use variables)

3. Variables syntax: `{{variable_name}}`

Example:
```json
{
  "email": "{{customer_email}}",
  "properties": ["firstname", "lastname", "company"]
}
```

## OpenAI Agent Configuration

### Basic Setup

```typescript
{
  name: "Customer Support Agent",
  instructions: "You help customers with subscription issues",
  model: "gpt-4o-2024-08-06",
  temperature: 0,
  tools: [...]
}
```

### With Tools

```typescript
{
  name: "Research Agent",
  tools: [
    {
      name: "web_search",
      description: "Search the web for information",
      parameters: z.object({
        query: z.string()
      })
    }
  ]
}
```

### With Handoffs

```typescript
{
  name: "Triage Agent",
  handoffs: [
    supportAgent,  // Transfer complex queries
    salesAgent     // Transfer sales inquiries
  ]
}
```

## Execution Monitoring

### Viewing Execution Trace

1. Navigate to Executions page
2. Click on an execution ID
3. View step-by-step trace:
   - Node ID
   - Status (success/error/pending)
   - Timestamp
   - Input/output data
   - Error messages

### Real-time Status

- **Running**: Workflow is currently executing
- **Completed**: Finished successfully
- **Failed**: Error occurred
- **Waiting Approval**: Paused for human input

## Slack Integration

### Setup

1. Configure Slack bot token in `.env`:
   ```
   SLACK_BOT_TOKEN=xoxb-your-token
   SLACK_REVIEW_CHANNEL=C01234ABCDE
   ```

2. Add bot to channels:
   ```
   /invite @agent-builder
   ```

### Approval Node Configuration

```json
{
  "channel": "#approvals",
  "message": "Review this draft: {{draft_text}}",
  "timeout": 3600,  // 1 hour
  "escalation": {
    "channel": "#urgent-approvals",
    "delay": 1800  // 30 minutes
  }
}
```

### Approval Actions

- ✅ **Approve**: Continue workflow with approved data
- ✏️ **Edit**: Modify data before continuing
- ❌ **Reject**: Stop workflow and log decision

## Webhook Triggers

### Creating a Webhook

1. Add **Webhook Trigger** node
2. Save workflow
3. Note the generated webhook URL:
   ```
   https://your-domain.com/webhook/<trigger_id>
   ```

### Sending Data

```bash
curl -X POST https://your-domain.com/webhook/<trigger_id> \
  -H "Content-Type: application/json" \
  -d '{
    "customer_email": "user@example.com",
    "message": "I need help with my subscription"
  }'
```

### Accessing Webhook Data

Use variables in subsequent nodes:
- `{{customer_email}}`
- `{{message}}`

## Cron Scheduling

### Schedule Formats

- Every hour: `0 * * * *`
- Daily at 9 AM: `0 9 * * *`
- Weekly on Monday: `0 9 * * 1`
- Monthly on 1st: `0 9 1 * *`

### Example Schedules

**Backup Database Daily**
```
Trigger: 0 2 * * * (2 AM daily)
→ MCP Tool: neon (execute_sql)
→ Save to S3
→ Slack notification
```

**Weekly Report**
```
Trigger: 0 9 * * 1 (Monday 9 AM)
→ Fetch data (Linear, HubSpot)
→ OpenAI Agent (analyze)
→ Send report (Slack)
```

## Variables and Data Flow

### Accessing Previous Node Data

```javascript
// From trigger
{{trigger_data}}

// From specific node (by output variable name)
{{email_classification}}

// Nested data
{{user.email}}
{{items[0].name}}
```

### Transform Node Examples

**Filter Array**
```javascript
function transform(input, variables) {
  return input.items.filter(item => item.status === 'active');
}
```

**Map Data**
```javascript
function transform(input, variables) {
  return input.users.map(user => ({
    id: user.id,
    fullName: `${user.first} ${user.last}`
  }));
}
```

**Aggregate**
```javascript
function transform(input, variables) {
  return {
    total: input.items.reduce((sum, item) => sum + item.price, 0),
    count: input.items.length,
    average: sum / input.items.length
  };
}
```

## Best Practices

### Error Handling

1. **Add fallback paths**: Use condition nodes to handle errors
2. **Set timeouts**: Prevent workflows from hanging
3. **Log failures**: Send errors to Slack for monitoring

### Security

1. **Validate inputs**: Use Zod schemas in Transform nodes
2. **Mask PII**: Use `maskPII()` from `@agents/core`
3. **Limit permissions**: Restrict MCP server access
4. **Audit approvals**: Track all human decisions

### Performance

1. **Parallel execution**: Use multiple paths from one node
2. **Cache results**: Store frequently-used data
3. **Batch operations**: Process arrays efficiently
4. **Rate limiting**: Respect API quotas

### Organization

1. **Name workflows clearly**: "HubSpot to Slack Sync"
2. **Document nodes**: Add descriptions
3. **Use templates**: Build reusable patterns
4. **Version control**: Export workflows as JSON

## Troubleshooting

### Workflow Not Executing

1. Check trigger is enabled
2. Verify webhook URL is correct
3. Check cron expression syntax
4. Review execution logs

### Node Failing

1. View execution trace
2. Check variable names (case-sensitive)
3. Verify MCP server connection
4. Test with manual trigger

### Slack Approval Not Posting

1. Verify bot token in `.env`
2. Check channel permissions
3. Confirm bot is in channel
4. Review Slack API logs

## API Reference

### Workflows

```typescript
// Create workflow
POST /api/workflows
{
  name: string;
  description?: string;
  nodes: Node[];
  edges: Edge[];
  configuration?: object;
}

// List workflows
GET /api/workflows

// Get workflow
GET /api/workflows/:id

// Update workflow
PUT /api/workflows/:id

// Delete workflow
DELETE /api/workflows/:id

// Execute workflow
POST /api/workflows/:id/execute
{
  input?: object;
}
```

### Executions

```typescript
// List executions
GET /api/executions?workflowId=<id>

// Get execution
GET /api/executions/:id

// Cancel execution
POST /api/executions/:id/cancel
```

### Triggers

```typescript
// Create trigger
POST /api/triggers
{
  workflowId: string;
  type: 'webhook' | 'schedule' | 'event';
  configuration: object;
}

// List triggers
GET /api/triggers?workflowId=<id>

// Update trigger
PUT /api/triggers/:id

// Delete trigger
DELETE /api/triggers/:id
```

## Next Steps

1. **Explore Templates**: Start with pre-built workflows
2. **Connect MCP Servers**: Integrate with your tools
3. **Set Up Slack**: Enable human approvals
4. **Build Custom Agents**: Create specialized AI agents
5. **Monitor Production**: Track execution metrics

## Support

- Documentation: See `AGENT_BUILDER_DESIGN.md`
- Architecture: See `IMPLEMENTATION_STATUS.md`
- Issues: GitHub Issues
- Questions: Slack #agent-builder channel

Happy Building! 🚀
