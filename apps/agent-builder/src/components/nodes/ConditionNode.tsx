import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { GitBranch, Settings } from 'lucide-react';

function ConditionNode({ data, selected }: NodeProps) {
  return (
    <div className={`px-4 py-3 rounded-xl ${selected ? 'ring-2 ring-amber-500' : ''}`}>
      <Handle type="target" position={Position.Top} className="!bg-amber-500" />
      
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 bg-white/20 rounded-lg">
          <GitBranch className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-sm">{data.label || 'Condition'}</div>
          <div className="text-xs opacity-80">If/Then/Else</div>
        </div>
        {data.config && (
          <Settings className="w-3.5 h-3.5 opacity-70" />
        )}
      </div>

      {data.condition && (
        <div className="text-xs opacity-90 mt-1 px-2 py-1 bg-white/10 rounded font-mono truncate">
          {data.condition}
        </div>
      )}
      
      <Handle type="source" position={Position.Bottom} id="true" className="!bg-green-500 !-bottom-1 !left-1/4" />
      <Handle type="source" position={Position.Bottom} id="false" className="!bg-red-500 !-bottom-1 !left-3/4" />
    </div>
  );
}

export default memo(ConditionNode);
