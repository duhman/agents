import { Handle, Position } from 'reactflow';

export function TriggerNode({ data }: any) {
  return (
    <div style={{
      padding: '12px',
      borderRadius: '8px',
      background: '#10b981',
      color: 'white',
      minWidth: '150px'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
        🚀 Trigger
      </div>
      <div style={{ fontSize: '12px' }}>
        {data.label || 'Start Workflow'}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#10b981' }}
      />
    </div>
  );
}
