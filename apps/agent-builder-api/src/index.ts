import Fastify from 'fastify';
import cors from '@fastify/cors';
import {
  createWorkflow,
  updateWorkflow,
  getWorkflowById,
  listWorkflows,
  deleteWorkflow,
  createExecution,
  updateExecution,
  getExecutionById,
  listExecutions,
  createTrigger,
  updateTrigger,
  listTriggers,
  deleteTrigger,
  createApproval,
  updateApproval,
  listPendingApprovals
} from '@agents/db';

const fastify = Fastify({
  logger: true
});

await fastify.register(cors, {
  origin: true
});

fastify.get('/api/health', async () => {
  return { status: 'healthy', timestamp: new Date().toISOString() };
});

fastify.post('/api/workflows', async (request, reply) => {
  const body = request.body as any;
  const workflow = await createWorkflow({
    name: body.name,
    description: body.description,
    nodes: body.nodes || [],
    edges: body.edges || [],
    configuration: body.configuration || {}
  });
  return workflow;
});

fastify.get('/api/workflows', async () => {
  return await listWorkflows();
});

fastify.get('/api/workflows/:id', async (request) => {
  const { id } = request.params as { id: string };
  const workflow = await getWorkflowById(id);
  if (!workflow) {
    throw new Error('Workflow not found');
  }
  return workflow;
});

fastify.put('/api/workflows/:id', async (request) => {
  const { id } = request.params as { id: string };
  const body = request.body as any;
  return await updateWorkflow(id, body);
});

fastify.delete('/api/workflows/:id', async (request) => {
  const { id } = request.params as { id: string };
  await deleteWorkflow(id);
  return { success: true };
});

fastify.post('/api/workflows/:id/execute', async (request) => {
  const { id } = request.params as { id: string };
  const body = request.body as any;
  
  const execution = await createExecution({
    workflowId: id,
    triggerType: 'manual',
    triggerData: body.input || {}
  });
  
  return execution;
});

fastify.get('/api/executions', async (request) => {
  const { workflowId } = request.query as { workflowId?: string };
  return await listExecutions(workflowId);
});

fastify.get('/api/executions/:id', async (request) => {
  const { id } = request.params as { id: string };
  return await getExecutionById(id);
});

fastify.post('/api/triggers', async (request) => {
  const body = request.body as any;
  return await createTrigger(body);
});

fastify.get('/api/triggers', async (request) => {
  const { workflowId } = request.query as { workflowId: string };
  return await listTriggers(workflowId);
});

fastify.put('/api/triggers/:id', async (request) => {
  const { id } = request.params as { id: string };
  const body = request.body as any;
  return await updateTrigger(id, body);
});

fastify.delete('/api/triggers/:id', async (request) => {
  const { id } = request.params as { id: string };
  await deleteTrigger(id);
  return { success: true };
});

fastify.get('/api/approvals', async () => {
  return await listPendingApprovals();
});

fastify.post('/api/approvals/:id/approve', async (request) => {
  const { id } = request.params as { id: string };
  const body = request.body as any;
  return await updateApproval(id, {
    status: 'approved',
    approverSlackId: body.approverSlackId,
    decisionData: body.decisionData,
    resolvedAt: new Date()
  });
});

fastify.post('/api/approvals/:id/reject', async (request) => {
  const { id } = request.params as { id: string };
  const body = request.body as any;
  return await updateApproval(id, {
    status: 'rejected',
    approverSlackId: body.approverSlackId,
    decisionData: body.decisionData,
    resolvedAt: new Date()
  });
});

fastify.get('/api/mcp/servers', async () => {
  return [
    { name: 'context7', description: 'Access documentation for npm packages' },
    { name: 'hubspot', description: 'HubSpot CRM integration' },
    { name: 'slack', description: 'Slack workspace management' },
    { name: 'linear', description: 'Linear project management' },
    { name: 'neon', description: 'Neon Postgres management' }
  ];
});

try {
  await fastify.listen({ port: 3001, host: '0.0.0.0' });
  console.log('Agent Builder API running on http://localhost:3001');
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
