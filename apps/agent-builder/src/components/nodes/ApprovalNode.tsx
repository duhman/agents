import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { UserCheck, Settings } from 'lucide-react';

function ApprovalNode({ data, selected }: NodeProps) {
  return (
    <div className={`px-4 py-3 rounded-xl ${selected ? 'ring-2 ring-purple-500' : ''}`}>
      <Handle type="target" position={Position.Top} className="!bg-purple-500" />
      
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 bg-white/20 rounded-lg">
          <UserCheck className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-sm">{data.label || 'Approval'}</div>
          <div className="text-xs opacity-80">Human Review</div>
        </div>
        {data.config && (
          <Settings className="w-3.5 h-3.5 opacity-70" />
        )}
      </div>

      {data.channel && (
        <div className="text-xs opacity-90 mt-1 px-2 py-1 bg-white/10 rounded">
          #{data.channel}
        </div>
      )}
      
      <Handle type="source" position={Position.Bottom} className="!bg-purple-500" />
    </div>
  );
}

export default memo(ApprovalNode);
