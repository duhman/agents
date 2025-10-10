'use client';

import React, { useMemo } from 'react';
import ReactFlow, { Background, Controls } from '@xyflow/react';

type NodeMeta = {
  footer?: string;
  status?: string;
  linkUrl?: string;
};

export function WorkflowCanvas({
  nodes,
  edges,
  nodeMeta
}: {
  nodes: any[];
  edges: any[];
  nodeMeta: Record<string, NodeMeta>;
}) {
  const enhancedNodes = useMemo(
    () =>
      (nodes || []).map((n) => ({
        ...n,
        data: {
          ...n.data,
          footer: nodeMeta[n.id]?.footer ?? '',
          status: nodeMeta[n.id]?.status ?? 'idle',
          linkUrl: nodeMeta[n.id]?.linkUrl
        }
      })),
    [nodes, nodeMeta]
  );

  return (
    <div className="h-full w-full">
      <ReactFlow nodes={enhancedNodes} edges={edges} fitView>
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}
