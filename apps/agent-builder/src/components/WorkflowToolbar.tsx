import { Play, Save, Layers } from 'lucide-react';

interface WorkflowToolbarProps {
  workflowName: string;
  onWorkflowNameChange: (name: string) => void;
  onSave: () => void;
  onExecute: () => void;
}

export function WorkflowToolbar({ workflowName, onWorkflowNameChange, onSave, onExecute }: WorkflowToolbarProps) {
  return (
    <div className="h-16 border-b border-gray-200 px-6 flex items-center justify-between bg-white shadow-sm">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              Agent Builder
            </h1>
            <p className="text-xs text-gray-500">Visual workflow designer</p>
          </div>
        </div>
        
        <div className="h-8 w-px bg-gray-200"></div>
        
        <input
          type="text"
          value={workflowName}
          onChange={(e) => onWorkflowNameChange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Untitled Workflow"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onSave}
          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
        >
          <Save size={16} />
          Save
        </button>
        
        <button
          onClick={onExecute}
          className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all flex items-center gap-2 text-sm font-medium shadow-md hover:shadow-lg"
        >
          <Play size={16} />
          Run Workflow
        </button>
      </div>
    </div>
  );
}
