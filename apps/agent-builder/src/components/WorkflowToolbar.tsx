import { Play, Save } from 'lucide-react';

interface WorkflowToolbarProps {
  workflowName: string;
  onWorkflowNameChange: (name: string) => void;
  onSave: () => void;
  onExecute: () => void;
}

export function WorkflowToolbar({ workflowName, onWorkflowNameChange, onSave, onExecute }: WorkflowToolbarProps) {
  return (
    <div style={{
      height: '60px',
      borderBottom: '1px solid #e5e7eb',
      padding: '0 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'white'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
          Agent Builder
        </h1>
        
        <input
          type="text"
          value={workflowName}
          onChange={(e) => onWorkflowNameChange(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            fontSize: '14px',
            width: '300px'
          }}
          placeholder="Workflow name..."
        />
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={onSave}
          style={{
            padding: '8px 16px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '14px'
          }}
        >
          <Save size={16} />
          Save
        </button>
        
        <button
          onClick={onExecute}
          style={{
            padding: '8px 16px',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '14px'
          }}
        >
          <Play size={16} />
          Execute
        </button>
      </div>
    </div>
  );
}
