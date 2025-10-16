# Agent Builder - Visual Workflow Editor

A Langflow-inspired visual agent builder for creating AI-powered workflows using OpenAI's Agent SDK and MCP servers.

## Overview

The Agent Builder frontend provides a drag-and-drop interface for building complex agent workflows visually. Built with React, React Flow, and Tailwind CSS, it offers a polished, gradient-styled UI similar to Langflow.

## Features

✨ **Visual Workflow Editor**
- Drag-and-drop node-based interface powered by React Flow
- Gradient-styled nodes with category-specific colors
- Connection handles for building workflow graphs
- Pan, zoom, and navigate large workflows

🎨 **Modern UI Design**
- Langflow-inspired gradient aesthetics
- Color-coded node categories (green for triggers, cyan for AI agents, pink for MCP tools, etc.)
- Lucide React icons for visual clarity
- Shadow effects and smooth animations
- Responsive layout with sidebars

🔧 **Node Configuration**
- Dynamic configuration panel that adapts to node type
- OpenAI Agent settings: model, temperature, instructions, maxTokens, topP
- MCP server and tool selection with parameter configuration
- Condition expressions with variable syntax support
- Slack channel configuration for approval nodes

📊 **Execution Monitoring**
- Real-time execution panel with expandable traces
- Node-level status indicators (success, error, pending)
- Input/output data inspection
- Error details and stack traces
- Timestamp tracking for performance analysis

🎯 **Node Types**
- **Triggers**: Manual, webhook, schedule (green gradient)
- **OpenAI Agents**: Full Agent SDK configuration (cyan gradient)
- **MCP Tools**: Connect to any MCP server (pink gradient)
- **Actions**: HTTP requests, transformations (blue gradient)
- **Conditions**: JavaScript expressions with dual outputs (amber gradient)
- **Approvals**: Slack human-in-the-loop review (purple gradient)

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm package manager
- Running agent-builder-api backend (see `apps/agent-builder-api`)
- PostgreSQL database (via Docker in `infra/`)

### Installation

```bash
cd apps/agent-builder
pnpm install
```

### Development

```bash
pnpm dev
```

This starts the Vite dev server at http://localhost:5173

### Build

```bash
pnpm build
```

Builds the production bundle to `dist/`

### Preview

```bash
pnpm preview
```

Preview the production build locally

## Project Structure

```
apps/agent-builder/
├── src/
│   ├── components/
│   │   ├── nodes/             # Node type implementations
│   │   │   ├── OpenAIAgentNode.tsx   # Cyan gradient AI agent
│   │   │   ├── MCPToolNode.tsx       # Pink gradient MCP integration
│   │   │   ├── TriggerNode.tsx       # Green gradient trigger
│   │   │   ├── ActionNode.tsx        # Blue gradient action
│   │   │   ├── ConditionNode.tsx     # Amber gradient branching
│   │   │   └── ApprovalNode.tsx      # Purple gradient HITM
│   │   ├── NodePalette.tsx    # Left sidebar node library
│   │   ├── NodeConfigPanel.tsx # Right sidebar configuration
│   │   ├── ExecutionPanel.tsx  # Right sidebar execution monitor
│   │   └── WorkflowToolbar.tsx # Top toolbar with save/execute
│   ├── App.tsx                # Main React Flow canvas
│   ├── main.tsx               # App entrypoint
│   └── index.css              # Tailwind styles
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

## Usage

### Creating a Workflow

1. **Enter workflow name** in the toolbar
2. **Drag nodes** from the Node Palette onto the canvas
3. **Connect nodes** by dragging from output handle (bottom) to input handle (top)
4. **Configure nodes** by clicking them to open the configuration panel
5. **Save workflow** using the Save button
6. **Execute workflow** using the Execute button
7. **Monitor execution** in the Execution Panel

### Node Configuration Examples

#### OpenAI Agent Node

```typescript
{
  name: "Email Classifier",
  model: "gpt-4o-2024-08-06",
  instructions: "Classify emails as urgent, normal, or spam",
  temperature: 0,
  maxTokens: 1000,
  topP: 1
}
```

#### MCP Tool Node

```typescript
{
  server: "hubspot",
  tool: "get_contact",
  parameters: {
    email: "{{customer_email}}"
  }
}
```

#### Condition Node

```typescript
{
  condition: "{{classification}} === 'urgent'"
}
```

### Variable Syntax

Access data from previous nodes using double curly braces:

- `{{variable_name}}` - Simple variable
- `{{user.email}}` - Nested property
- `{{items[0].name}}` - Array access

## Technologies

- **React 18**: UI framework
- **React Flow**: Node-based workflow editor
- **Tailwind CSS**: Utility-first styling
- **Vite**: Fast build tool and dev server
- **Lucide React**: Icon library
- **TypeScript**: Type safety

## API Integration

The frontend communicates with the agent-builder-api backend:

- `POST /api/workflows` - Create/update workflow
- `GET /api/workflows/:id` - Load workflow
- `POST /api/workflows/:id/execute` - Execute workflow
- `GET /api/executions/:id` - Get execution status
- `GET /api/mcp/servers` - List available MCP servers

## Environment Variables

Create a `.env` file if needed:

```env
VITE_API_URL=http://localhost:3001
```

Default API URL is `http://localhost:3001` if not specified.

## Styling

The app uses Tailwind CSS with custom gradient configurations:

- Node gradients: `from-{color}-50 to-{color}-100`
- Shadows: `shadow-sm`, `shadow-md`, `shadow-lg`
- Borders: `border-2 border-{color}-200`
- Selected state: `ring-2 ring-{color}-400`

## Contributing

When adding new node types:

1. Create a new component in `src/components/nodes/`
2. Add gradient styling matching the category
3. Include Lucide icon for visual identification
4. Register in `NodePalette.tsx`
5. Add configuration fields in `NodeConfigPanel.tsx`

## Troubleshooting

**Nodes not dragging**
- Ensure React Flow is properly initialized
- Check that node components have proper handles

**Configuration panel not updating**
- Verify node selection state is propagated
- Check that `onUpdate` callback is called

**Execution not displaying**
- Confirm backend API is running
- Check network tab for API errors
- Verify execution ID is correct

## Related Documentation

- [Agent Builder Design](../../AGENT_BUILDER_DESIGN.md) - Full architecture
- [Quick Start Guide](../../AGENT_BUILDER_QUICKSTART.md) - User guide
- [Implementation Status](../../IMPLEMENTATION_STATUS.md) - Current progress
- [Backend API](../agent-builder-api/README.md) - API documentation

## License

Part of the agents monorepo
