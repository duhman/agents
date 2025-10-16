import { useState, useCallback } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  NodeTypes
} from 'reactflow';
import 'reactflow/dist/style.css';
import { NodePalette } from './components/NodePalette';
import { WorkflowToolbar } from './components/WorkflowToolbar';
import { NodeConfigPanel } from './components/NodeConfigPanel';
import { ExecutionPanel } from './components/ExecutionPanel';
import TriggerNode from './components/nodes/TriggerNode';
import ActionNode from './components/nodes/ActionNode';
import ConditionNode from './components/nodes/ConditionNode';
import ApprovalNode from './components/nodes/ApprovalNode';
import OpenAIAgentNode from './components/nodes/OpenAIAgentNode';
import MCPToolNode from './components/nodes/MCPToolNode';

const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  approval: ApprovalNode,
  'openai-agent': OpenAIAgentNode,
  'mcp-tool': MCPToolNode
};

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [workflowName, setWorkflowName] = useState('Untitled Workflow');
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [activeExecutionId, setActiveExecutionId] = useState<string | null>(null);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top
      };

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: {
          label: `${type} Node`,
          config: {}
        }
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  const saveWorkflow = async () => {
    const workflow = {
      name: workflowName,
      nodes,
      edges,
      configuration: {}
    };

    try {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflow)
      });

      if (!response.ok) throw new Error('Failed to save workflow');

      const savedWorkflow = await response.json();
      console.log('Workflow saved:', savedWorkflow);
      alert('Workflow saved successfully!');
    } catch (error) {
      console.error('Error saving workflow:', error);
      alert('Failed to save workflow');
    }
  };

  const executeWorkflow = async () => {
    const workflow = {
      name: workflowName,
      nodes,
      edges
    };

    try {
      const saveResponse = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflow)
      });

      const savedWorkflow = await saveResponse.json();

      const executeResponse = await fetch(`/api/workflows/${savedWorkflow.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: {} })
      });

      const execution = await executeResponse.json();
      console.log('Execution started:', execution);
      setActiveExecutionId(execution.id);
      alert(`Workflow execution started! ID: ${execution.id}`);
    } catch (error) {
      console.error('Error executing workflow:', error);
      alert('Failed to execute workflow');
    }
  };

  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const handleNodeUpdate = useCallback((nodeId: string, data: any) => {
    setNodes((nds) => 
      nds.map((node) => 
        node.id === nodeId ? { ...node, data } : node
      )
    );
  }, [setNodes]);

  return (
    <div className="w-screen h-screen flex flex-col bg-gray-50">
      <WorkflowToolbar
        workflowName={workflowName}
        onWorkflowNameChange={setWorkflowName}
        onSave={saveWorkflow}
        onExecute={executeWorkflow}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <NodePalette />
        
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={handleNodeClick}
            nodeTypes={nodeTypes}
            fitView
            className="bg-gray-50"
          >
            <Controls className="shadow-lg" />
            <MiniMap className="shadow-lg" />
            <Background gap={16} size={1} color="#e5e7eb" />
          </ReactFlow>
        </div>

        <NodeConfigPanel
          selectedNode={selectedNode}
          onClose={() => setSelectedNode(null)}
          onUpdate={handleNodeUpdate}
        />
      </div>

      <ExecutionPanel executionId={activeExecutionId} />
    </div>
  );
}

export default App;
