import { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, Loader, ChevronDown, ChevronRight } from 'lucide-react';

interface ExecutionTrace {
  nodeId: string;
  type: string;
  timestamp: string;
  status: 'success' | 'error' | 'pending';
  result?: any;
  error?: string;
}

interface Execution {
  id: string;
  workflowId: string;
  status: string;
  startTime: string;
  endTime?: string;
  executionTrace: ExecutionTrace[];
}

interface ExecutionPanelProps {
  executionId: string | null;
}

export function ExecutionPanel({ executionId }: ExecutionPanelProps) {
  const [execution, setExecution] = useState<Execution | null>(null);
  const [expanded, setExpanded] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (!executionId) {
      setExecution(null);
      return;
    }

    const fetchExecution = async () => {
      try {
        const response = await fetch(`/api/executions/${executionId}`);
        const data = await response.json();
        setExecution(data);
      } catch (error) {
        console.error('Failed to fetch execution:', error);
      }
    };

    fetchExecution();
    const interval = setInterval(fetchExecution, 2000);

    return () => clearInterval(interval);
  }, [executionId]);

  if (!executionId || !execution) {
    return (
      <div className="absolute bottom-4 right-4 w-96 bg-white rounded-lg shadow-lg border border-gray-200 p-6 text-center text-gray-500">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No active execution</p>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <Loader className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'running':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="absolute bottom-4 right-4 w-96 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden max-h-[500px] flex flex-col">
      <div className={`p-4 border-b flex items-center justify-between ${getStatusColor(execution.status)}`}>
        <div className="flex items-center gap-2">
          {execution.status === 'running' && <Loader className="w-4 h-4 animate-spin" />}
          {execution.status === 'completed' && <CheckCircle className="w-4 h-4" />}
          {execution.status === 'failed' && <XCircle className="w-4 h-4" />}
          <span className="font-semibold text-sm capitalize">{execution.status}</span>
        </div>
        <span className="text-xs">
          {new Date(execution.startTime).toLocaleTimeString()}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Execution Trace</div>
        {execution.executionTrace && execution.executionTrace.length > 0 ? (
          execution.executionTrace.map((trace, index) => (
            <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpanded({ ...expanded, [index]: !expanded[index] })}
                className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(trace.status)}
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900 capitalize">{trace.type}</div>
                    <div className="text-xs text-gray-500">{trace.nodeId}</div>
                  </div>
                </div>
                {expanded[index] ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
              </button>

              {expanded[index] && (
                <div className="px-3 pb-3 space-y-2 bg-gray-50">
                  <div className="text-xs text-gray-500">
                    {new Date(trace.timestamp).toLocaleTimeString()}
                  </div>
                  
                  {trace.result && (
                    <div className="mt-2">
                      <div className="text-xs font-semibold text-gray-700 mb-1">Result:</div>
                      <pre className="text-xs bg-white p-2 rounded border border-gray-200 overflow-x-auto">
                        {JSON.stringify(trace.result, null, 2)}
                      </pre>
                    </div>
                  )}

                  {trace.error && (
                    <div className="mt-2">
                      <div className="text-xs font-semibold text-red-700 mb-1">Error:</div>
                      <div className="text-xs bg-red-50 p-2 rounded border border-red-200 text-red-800">
                        {trace.error}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-400 text-sm">
            No trace data available
          </div>
        )}
      </div>

      {execution.endTime && (
        <div className="p-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-600">
          Duration: {Math.round((new Date(execution.endTime).getTime() - new Date(execution.startTime).getTime()) / 1000)}s
        </div>
      )}
    </div>
  );
}
