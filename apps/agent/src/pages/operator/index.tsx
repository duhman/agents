// @ts-nocheck (important-comment)
'use client';

import React, { useEffect, useMemo, useRef } from "react";
import { WorkflowCanvas } from "../../components/operator/WorkflowCanvas";
import { useStore, store, selectNodeMeta } from "../../components/operator/store";

const FLAG = process.env.UI_EXPERIMENTAL_OPERATOR === "true";

export default function Operator() {
  const runs = useStore(s => s.runs);
  const selected = useStore(s => s.selectedRunId);
  const snapshot = useStore(s => s.snapshot);
  const latestArtifacts = useStore(s => s.latestArtifacts);
  const events = useStore(s => s.events);
  const evtRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!FLAG) return;
    fetch("/api/operator/runs")
      .then(r => r.json())
      .then(store.setRuns)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!FLAG) return;
    if (!selected) return;
    fetch(`/api/operator/runs/${selected}`)
      .then(r => r.json())
      .then((data) => {
        store.setSnapshot(data);
        store.mergeArtifact("bootstrap", data?.latestArtifacts || {});
      })
      .catch(() => {});
    evtRef.current?.close();
    const es = new EventSource(`/api/operator/runs/${selected}/stream`);
    es.addEventListener("artifact", (e: MessageEvent) => {
      try {
        const data = JSON.parse((e as any).data);
        store.pushEvent(data);
        store.mergeArtifact(data.type, data.data);
      } catch {}
    });
    es.addEventListener("heartbeat", () => {});
    evtRef.current = es;
    return () => {
      es.close();
    };
  }, [selected]);

  const body = useMemo(() => {
    if (!FLAG) return <div className="p-6 text-sm">Operator UI is disabled.</div>;
    const topology = snapshot?.topology;
    const nodeMeta = selectNodeMeta({ runs, selectedRunId: selected, snapshot, latestArtifacts, events });
    return (
      <div className="flex h-screen">
        <div className="w-80 border-r p-4 space-y-2 overflow-auto">
          <h2 className="font-medium mb-2">Recent Runs</h2>
          {runs.length === 0 ? <div className="text-xs text-gray-500">No runs</div> : null}
          {runs.map(r => (
            <button
              key={r.requestId}
              onClick={() => store.selectRun(r.requestId)}
              className={`w-full text-left text-sm rounded px-2 py-1 hover:bg-gray-100 ${selected === r.requestId ? "bg-gray-100" : ""}`}
            >
              <div className="font-mono text-xs">{r.requestId}</div>
              <div className="text-[11px] text-gray-500">
                {new Date(r.createdAt).toLocaleString()} • {r.status}
              </div>
            </button>
          ))}
        </div>
        <div className="flex-1 grid grid-cols-2 gap-4 p-4">
          <div className="border rounded p-3 overflow-hidden">
            <div className="font-medium mb-2">Workflow</div>
            {topology ? (
              <div className="h-[600px]">
                <WorkflowCanvas
                  nodes={topology.nodes}
                  edges={topology.edges}
                  nodeMeta={nodeMeta}
                />
              </div>
            ) : (
              <div className="text-xs text-gray-500">Select a run</div>
            )}
          </div>
          <div className="border rounded p-3 overflow-auto">
            <div className="font-medium mb-2">Live Artifacts</div>
            <ul className="space-y-2">
              {events.map((e, idx) => (
                <li key={idx} className="text-xs border rounded p-2">
                  {JSON.stringify(e)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }, [FLAG, runs, selected, snapshot, events, latestArtifacts]);

  return body;
}
