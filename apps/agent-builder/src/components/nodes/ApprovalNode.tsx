import { Handle, Position } from 'reactflow';

export function ApprovalNode({ data }: any) {
  return (
    <div style={{
      padding: '12px',
      borderRadius: '8px',
      background: '#8b5cf6',
      color: 'white',
      minWidth: '150px'
    }}>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#8b5cf6' }}
      />
      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
        ✅ Approval
      </div>
      <div style={{ fontSize: '12px' }}>
        {data.label || 'Human Review'}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#8b5cf6' }}
      />
    </div>
  );
}
