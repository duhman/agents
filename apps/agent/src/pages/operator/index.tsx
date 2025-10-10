// @ts-nocheck (important-comment)
'use client';

import React, { useEffect, useMemo, useRef, useState } from "react";

const FLAG = process.env.UI_EXPERIMENTAL_OPERATOR === "true";

type RunMeta = {
  requestId: string;
  createdAt: number;
  status: "running" | "completed" | "error";
  lastArtifactType?: string;
  updatedAt: number;
};

export default function Operator() {
  const [runs, setRuns] = useState<RunMeta[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const evtRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!FLAG) return;
    fetch("/api/operator/runs")
      .then(r => r.json())
      .then(setRuns)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!FLAG) return;
    if (!selected) return;
    fetch(`/api/operator/runs/${selected}`)
      .then(r => r.json())
      .then(setSnapshot)
      .catch(() => {});
    evtRef.current?.close();
    const es = new EventSource(`/api/operator/runs/${selected}/stream`);
    es.addEventListener("artifact", (e: MessageEvent) => {
      try {
        const data = JSON.parse((e as any).data);
        setEvents(prev => [data, ...prev].slice(0, 200));
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
    return (
      <div className="flex h-screen">
        <div className="w-80 border-r p-4 space-y-2 overflow-auto">
          <h2 className="font-medium mb-2">Recent Runs</h2>
          {runs.length === 0 ? <div className="text-xs text-gray-500">No runs</div> : null}
          {runs.map(r => (
            <button
              key={r.requestId}
              onClick={() => setSelected(r.requestId)}
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
          <div className="border rounded p-3 overflow-auto">
            <div className="font-medium mb-2">Snapshot</div>
            <pre className="text-xs whitespace-pre-wrap">{snapshot ? JSON.stringify(snapshot, null, 2) : "Select a run"}</pre>
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
  }, [FLAG, runs, selected, snapshot, events]);

  return body;
}
