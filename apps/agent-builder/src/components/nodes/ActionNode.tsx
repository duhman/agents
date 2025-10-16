import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Play, Settings } from 'lucide-react';

function ActionNode({ data, selected }: NodeProps) {
  return (
    <div className={`px-4 py-3 rounded-xl ${selected ? 'ring-2 ring-blue-500' : ''}`}>
      <Handle type="target" position={Position.Top} className="!bg-blue-500" />
      
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 bg-white/20 rounded-lg">
          <Play className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-sm">{data.label || 'Action'}</div>
          <div className="text-xs opacity-80">{data.actionType || 'Generic'}</div>
        </div>
        {data.config && (
          <Settings className="w-3.5 h-3.5 opacity-70" />
        )}
      </div>

      {data.description && (
        <div className="text-xs opacity-90 mt-1 px-2 py-1 bg-white/10 rounded">
          {data.description}
        </div>
      )}
      
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500" />
    </div>
  );
}

export default memo(ActionNode);
