import { Handle, Position } from 'reactflow';

export function ConditionNode({ data }: any) {
  return (
    <div style={{
      padding: '12px',
      borderRadius: '8px',
      background: '#f59e0b',
      color: 'white',
      minWidth: '150px'
    }}>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#f59e0b' }}
      />
      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
        🔀 Condition
      </div>
      <div style={{ fontSize: '12px' }}>
        {data.label || 'If/Else Logic'}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        style={{ left: '30%', background: '#10b981' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        style={{ left: '70%', background: '#ef4444' }}
      />
    </div>
  );
}
