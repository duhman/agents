import { Handle, Position } from 'reactflow';

export function ActionNode({ data }: any) {
  return (
    <div style={{
      padding: '12px',
      borderRadius: '8px',
      background: '#3b82f6',
      color: 'white',
      minWidth: '150px'
    }}>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#3b82f6' }}
      />
      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
        ⚡ Action
      </div>
      <div style={{ fontSize: '12px' }}>
        {data.label || 'Perform Action'}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#3b82f6' }}
      />
    </div>
  );
}
