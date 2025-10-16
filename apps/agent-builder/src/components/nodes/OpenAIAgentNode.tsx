import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Bot, Settings } from 'lucide-react';

function OpenAIAgentNode({ data, selected }: NodeProps) {
  return (
    <div className={`px-4 py-3 rounded-xl ${selected ? 'ring-2 ring-cyan-500' : ''}`}>
      <Handle type="target" position={Position.Top} className="!bg-cyan-500" />
      
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 bg-white/20 rounded-lg">
          <Bot className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-sm">{data.label || 'OpenAI Agent'}</div>
          <div className="text-xs opacity-80">{data.agentConfig?.model || 'gpt-4o'}</div>
        </div>
        {data.config && (
          <Settings className="w-3.5 h-3.5 opacity-70" />
        )}
      </div>

      {data.agentConfig?.name && (
        <div className="text-xs opacity-90 mt-1 px-2 py-1 bg-white/10 rounded">
          {data.agentConfig.name}
        </div>
      )}
      
      <Handle type="source" position={Position.Bottom} className="!bg-cyan-500" />
    </div>
  );
}

export default memo(OpenAIAgentNode);
