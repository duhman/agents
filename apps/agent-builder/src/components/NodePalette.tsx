import { Zap, Bot, Plug, GitBranch, UserCheck, Globe, Code } from 'lucide-react';

export function NodePalette() {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const nodeCategories = [
    {
      name: 'Triggers',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      nodes: [
        { type: 'trigger', label: 'Webhook', icon: Zap, description: 'Start on HTTP request' },
        { type: 'trigger', label: 'Cron Schedule', icon: Zap, description: 'Run on schedule' },
        { type: 'trigger', label: 'Manual', icon: Zap, description: 'Run manually' }
      ]
    },
    {
      name: 'AI Agents',
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
      borderColor: 'border-cyan-200',
      nodes: [
        { type: 'openai-agent', label: 'OpenAI Agent', icon: Bot, description: 'Run AI agent' },
      ]
    },
    {
      name: 'MCP Tools',
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      borderColor: 'border-pink-200',
      nodes: [
        { type: 'mcp-tool', label: 'MCP Tool', icon: Plug, description: 'Call MCP server' },
      ]
    },
    {
      name: 'Actions',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      nodes: [
        { type: 'action', label: 'HTTP Request', icon: Globe, description: 'Make HTTP call' },
        { type: 'action', label: 'Transform', icon: Code, description: 'Transform data' }
      ]
    },
    {
      name: 'Control Flow',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      nodes: [
        { type: 'condition', label: 'Condition', icon: GitBranch, description: 'Branch logic' },
      ]
    },
    {
      name: 'Human-in-the-Loop',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      nodes: [
        { type: 'approval', label: 'Slack Approval', icon: UserCheck, description: 'Get approval' },
      ]
    }
  ];

  return (
    <div className="w-72 border-r border-gray-200 bg-white overflow-y-auto">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900">
          Component Library
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Drag and drop to build workflows
        </p>
      </div>
      
      <div className="p-4 space-y-6">
        {nodeCategories.map((category) => (
          <div key={category.name}>
            <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${category.color}`}>
              {category.name}
            </h3>
            
            <div className="space-y-2">
              {category.nodes.map((node, index) => {
                const Icon = node.icon;
                return (
                  <div
                    key={`${node.type}-${index}`}
                    draggable
                    onDragStart={(e) => onDragStart(e, node.type)}
                    className={`
                      p-3 rounded-lg border cursor-grab
                      bg-white hover:shadow-md transition-all
                      ${category.borderColor} hover:border-gray-300
                      group
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-md ${category.bgColor}`}>
                        <Icon className={`w-4 h-4 ${category.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 truncate">
                          {node.label}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {node.description}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
