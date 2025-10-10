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
  nodeMeta,
  edgeStatuses
}: {
  nodes: any[];
  edges: any[];
  nodeMeta: Record<string, NodeMeta>;
  edgeStatuses?: Record<string, "animated" | "temporary" | "idle">;
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

  const enhancedEdges = useMemo(
    () =>
      (edges || []).map((e) => ({
        ...e,
        animated: edgeStatuses?.[e.id] === "animated",
        type: edgeStatuses?.[e.id] === "temporary" ? "temporary" : e.type
      })),
    [edges, edgeStatuses]
  );
  return (
    <div className="h-full w-full">
      <ReactFlow nodes={enhancedNodes} edges={enhancedEdges} fitView>
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}
