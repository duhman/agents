import { X, Settings, Bot, Plug, Zap, GitBranch, UserCheck } from 'lucide-react';
import { Node } from 'reactflow';

interface NodeConfigPanelProps {
  selectedNode: Node | null;
  onClose: () => void;
  onUpdate: (nodeId: string, data: any) => void;
}

export function NodeConfigPanel({ selectedNode, onClose, onUpdate }: NodeConfigPanelProps) {
  if (!selectedNode) return null;

  const handleDataChange = (field: string, value: any) => {
    onUpdate(selectedNode.id, {
      ...selectedNode.data,
      [field]: value
    });
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'trigger': return Zap;
      case 'openai-agent': return Bot;
      case 'mcp-tool': return Plug;
      case 'condition': return GitBranch;
      case 'approval': return UserCheck;
      default: return Settings;
    }
  };

  const Icon = getNodeIcon(selectedNode.type || '');

  return (
    <div className="w-96 border-l border-gray-200 bg-white overflow-y-auto flex flex-col">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Icon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Node Configuration</h3>
            <p className="text-xs text-gray-500 capitalize">{selectedNode.type}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className="flex-1 p-4 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Label
          </label>
          <input
            type="text"
            value={selectedNode.data.label || ''}
            onChange={(e) => handleDataChange('label', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Node label..."
          />
        </div>

        {selectedNode.type === 'openai-agent' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agent Name
              </label>
              <input
                type="text"
                value={selectedNode.data.agentConfig?.name || ''}
                onChange={(e) => handleDataChange('agentConfig', { 
                  ...selectedNode.data.agentConfig, 
                  name: e.target.value 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="My Agent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Model
              </label>
              <select
                value={selectedNode.data.agentConfig?.model || 'gpt-4o-2024-08-06'}
                onChange={(e) => handleDataChange('agentConfig', { 
                  ...selectedNode.data.agentConfig, 
                  model: e.target.value 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="gpt-4o-2024-08-06">GPT-4o (2024-08-06)</option>
                <option value="gpt-4o-mini">GPT-4o Mini</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Instructions
              </label>
              <textarea
                value={selectedNode.data.agentConfig?.instructions || ''}
                onChange={(e) => handleDataChange('agentConfig', { 
                  ...selectedNode.data.agentConfig, 
                  instructions: e.target.value 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                rows={6}
                placeholder="You are a helpful assistant..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Temperature: {selectedNode.data.agentConfig?.temperature ?? 0}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={selectedNode.data.agentConfig?.temperature ?? 0}
                onChange={(e) => handleDataChange('agentConfig', { 
                  ...selectedNode.data.agentConfig, 
                  temperature: parseFloat(e.target.value) 
                })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Precise</span>
                <span>Creative</span>
              </div>
            </div>
          </>
        )}

        {selectedNode.type === 'mcp-tool' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                MCP Server
              </label>
              <select
                value={selectedNode.data.server || ''}
                onChange={(e) => handleDataChange('server', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select server...</option>
                <option value="hubspot">HubSpot</option>
                <option value="slack">Slack</option>
                <option value="linear">Linear</option>
                <option value="neon">Neon</option>
                <option value="notion">Notion</option>
                <option value="supabase">Supabase</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tool Name
              </label>
              <input
                type="text"
                value={selectedNode.data.tool || ''}
                onChange={(e) => handleDataChange('tool', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="tool_name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Parameters (JSON)
              </label>
              <textarea
                value={JSON.stringify(selectedNode.data.parameters || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const params = JSON.parse(e.target.value);
                    handleDataChange('parameters', params);
                  } catch (err) {
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                rows={6}
                placeholder="{}"
              />
            </div>
          </>
        )}

        {selectedNode.type === 'condition' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Condition Expression
            </label>
            <input
              type="text"
              value={selectedNode.data.condition || ''}
              onChange={(e) => handleDataChange('condition', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              placeholder="{{variable}} === 'value'"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use {'{{'} and {'}}'} to reference variables
            </p>
          </div>
        )}

        {selectedNode.type === 'approval' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Slack Channel
            </label>
            <input
              type="text"
              value={selectedNode.data.channel || ''}
              onChange={(e) => handleDataChange('channel', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="general"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={selectedNode.data.description || ''}
            onChange={(e) => handleDataChange('description', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Describe what this node does..."
          />
        </div>
      </div>
    </div>
  );
}
