export function NodePalette() {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const nodeCategories = [
    {
      name: 'Triggers',
      nodes: [
        { type: 'trigger', label: 'Webhook Trigger', icon: '🔗' },
        { type: 'trigger', label: 'Schedule Trigger', icon: '⏰' },
        { type: 'trigger', label: 'Manual Trigger', icon: '👆' }
      ]
    },
    {
      name: 'Actions',
      nodes: [
        { type: 'action', label: 'OpenAI Agent', icon: '🤖' },
        { type: 'action', label: 'MCP Tool', icon: '🔧' },
        { type: 'action', label: 'HTTP Request', icon: '🌐' },
        { type: 'action', label: 'Transform Data', icon: '⚙️' }
      ]
    },
    {
      name: 'Control Flow',
      nodes: [
        { type: 'condition', label: 'Condition', icon: '🔀' },
        { type: 'condition', label: 'Loop', icon: '🔁' },
        { type: 'condition', label: 'Switch', icon: '🔂' }
      ]
    },
    {
      name: 'Human-in-the-Loop',
      nodes: [
        { type: 'approval', label: 'Slack Approval', icon: '✅' },
        { type: 'approval', label: 'Form Input', icon: '📝' }
      ]
    }
  ];

  return (
    <div style={{
      width: '250px',
      borderRight: '1px solid #ddd',
      padding: '20px',
      overflowY: 'auto',
      background: '#f9fafb'
    }}>
      <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px' }}>
        Node Library
      </h2>
      
      {nodeCategories.map((category) => (
        <div key={category.name} style={{ marginBottom: '30px' }}>
          <h3 style={{
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '10px',
            color: '#6b7280'
          }}>
            {category.name}
          </h3>
          
          {category.nodes.map((node, index) => (
            <div
              key={`${node.type}-${index}`}
              draggable
              onDragStart={(e) => onDragStart(e, node.type)}
              style={{
                padding: '10px',
                marginBottom: '8px',
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                cursor: 'grab',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span style={{ fontSize: '20px' }}>{node.icon}</span>
              <span style={{ fontSize: '13px' }}>{node.label}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
