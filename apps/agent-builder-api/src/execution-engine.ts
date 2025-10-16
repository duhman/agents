import { getWorkflowById, updateExecution, createApproval } from '@agents/db';
import { Agent } from '@openai/agents';
import { z } from 'zod';

export interface WorkflowNode {
  id: string;
  type: string;
  data: any;
  position: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface ExecutionContext {
  executionId: string;
  workflowId: string;
  variables: Record<string, any>;
  trace: Array<{
    nodeId: string;
    type: string;
    timestamp: string;
    status: 'success' | 'error' | 'pending';
    result?: any;
    error?: string;
  }>;
}

interface TraceEntry {
  nodeId: string;
  type: string;
  timestamp: string;
  status: 'success' | 'error' | 'pending';
  result?: any;
  error?: string;
}

export class WorkflowExecutionEngine {
  async executeWorkflow(executionId: string, workflowId: string, triggerData: any): Promise<void> {
    const workflow = await getWorkflowById(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const context: ExecutionContext = {
      executionId,
      workflowId,
      variables: { ...triggerData },
      trace: []
    };

    try {
      const nodes = workflow.nodes as WorkflowNode[];
      const edges = workflow.edges as WorkflowEdge[];

      const startNodes = nodes.filter(n => n.type === 'trigger' || n.type === 'start');
      if (startNodes.length === 0) {
        throw new Error('No start node found in workflow');
      }

      for (const startNode of startNodes) {
        await this.executeNode(startNode, nodes, edges, context);
      }

      await updateExecution(executionId, {
        status: 'completed',
        endTime: new Date(),
        executionTrace: context.trace
      });
    } catch (error: any) {
      await updateExecution(executionId, {
        status: 'failed',
        endTime: new Date(),
        executionTrace: context.trace,
        error: error.message
      });
      throw error;
    }
  }

  private async executeNode(
    node: WorkflowNode,
    allNodes: WorkflowNode[],
    edges: WorkflowEdge[],
    context: ExecutionContext
  ): Promise<any> {
    const traceEntry: TraceEntry = {
      nodeId: node.id,
      type: node.type,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };
    context.trace.push(traceEntry);

    try {
      let result: any;

      switch (node.type) {
        case 'trigger':
        case 'start':
          result = context.variables;
          break;

        case 'openai-agent':
          result = await this.executeOpenAIAgent(node, context);
          break;

        case 'mcp-tool':
          result = await this.executeMCPTool(node, context);
          break;

        case 'condition':
          result = await this.executeCondition(node, context);
          break;

        case 'slack-approval':
          result = await this.executeSlackApproval(node, context);
          break;

        case 'http-request':
          result = await this.executeHTTPRequest(node, context);
          break;

        case 'transform':
          result = await this.executeTransform(node, context);
          break;

        default:
          throw new Error(`Unknown node type: ${node.type}`);
      }

      traceEntry.status = 'success';
      traceEntry.result = result;

      if (node.data.outputVariable) {
        context.variables[node.data.outputVariable] = result;
      }

      const nextEdges = edges.filter(e => e.source === node.id);
      for (const edge of nextEdges) {
        const nextNode = allNodes.find(n => n.id === edge.target);
        if (nextNode) {
          await this.executeNode(nextNode, allNodes, edges, context);
        }
      }

      return result;
    } catch (error: any) {
      traceEntry.status = 'error';
      traceEntry.error = error.message;
      throw error;
    }
  }

  private async executeOpenAIAgent(node: WorkflowNode, context: ExecutionContext): Promise<any> {
    const { agentConfig, prompt, tools, handoffs, outputSchema } = node.data;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const agentTools = tools?.map((t: any) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters ? z.object(t.parameters) : z.object({}),
      execute: async (params: any) => {
        return { result: `Tool ${t.name} executed with params: ${JSON.stringify(params)}` };
      }
    })) || [];

    const agent = new Agent({
      name: agentConfig?.name || 'Agent',
      instructions: agentConfig?.instructions || prompt || 'You are a helpful assistant',
      model: agentConfig?.model || 'gpt-4o-2024-08-06',
      modelSettings: {
        temperature: agentConfig?.temperature ?? 0,
        maxTokens: agentConfig?.maxTokens,
        topP: agentConfig?.topP
      },
      tools: agentTools.length > 0 ? agentTools : undefined,
      outputType: outputSchema ? z.object(outputSchema) : undefined
    });

    const input = this.resolveVariables(prompt || agentConfig?.defaultInput || '', context.variables);
    
    return {
      agent: agentConfig?.name || 'Agent',
      input,
      output: 'Agent execution completed (full SDK integration in progress)',
      model: agentConfig?.model || 'gpt-4o-2024-08-06',
      timestamp: new Date().toISOString(),
      configuration: {
        name: agent.name,
        instructions: agentConfig?.instructions || prompt || 'You are a helpful assistant',
        temperature: agentConfig?.temperature ?? 0,
        tools: agentTools.length
      }
    };
  }

  private async executeMCPTool(node: WorkflowNode, context: ExecutionContext): Promise<any> {
    const { server, tool, parameters } = node.data;
    const resolvedParams = this.resolveVariables(parameters, context.variables);

    try {
      const mcpClient = await this.getMCPClient(server);
      const result = await mcpClient.callTool(tool, resolvedParams);
      
      return {
        server,
        tool,
        parameters: resolvedParams,
        result,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      throw new Error(`MCP tool execution failed: ${error.message}`);
    }
  }

  private async getMCPClient(serverName: string): Promise<any> {
    return {
      callTool: async (toolName: string, params: any) => {
        return { success: true, data: `Called ${toolName} on ${serverName}` };
      }
    };
  }

  private async executeCondition(node: WorkflowNode, context: ExecutionContext): Promise<any> {
    const { condition } = node.data;
    const resolved = this.resolveVariables(condition, context.variables);
    
    return Boolean(resolved);
  }

  private async executeSlackApproval(node: WorkflowNode, context: ExecutionContext): Promise<any> {
    const approval = await createApproval({
      executionId: context.executionId,
      nodeId: node.id,
      slackChannel: node.data.channel
    });

    await updateExecution(context.executionId, {
      status: 'waiting_approval'
    });

    return {
      approvalId: approval.id,
      status: 'pending',
      message: 'Waiting for human approval'
    };
  }

  private async executeHTTPRequest(node: WorkflowNode, context: ExecutionContext): Promise<any> {
    const { url, method, headers, body } = node.data;
    const resolvedUrl = this.resolveVariables(url, context.variables);
    const resolvedBody = this.resolveVariables(body, context.variables);

    const response = await fetch(resolvedUrl, {
      method: method || 'GET',
      headers: headers || {},
      body: resolvedBody ? JSON.stringify(resolvedBody) : undefined
    });

    return await response.json();
  }

  private async executeTransform(node: WorkflowNode, context: ExecutionContext): Promise<any> {
    const { transformFunction } = node.data;
    const func = new Function('input', 'variables', transformFunction);
    return func(context.variables.input, context.variables);
  }

  private resolveVariables(value: any, variables: Record<string, any>): any {
    if (typeof value === 'string') {
      return value.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? '');
    }
    if (Array.isArray(value)) {
      return value.map(v => this.resolveVariables(v, variables));
    }
    if (typeof value === 'object' && value !== null) {
      const result: any = {};
      for (const [k, v] of Object.entries(value)) {
        result[k] = this.resolveVariables(v, variables);
      }
      return result;
    }
    return value;
  }
}

export const executionEngine = new WorkflowExecutionEngine();
