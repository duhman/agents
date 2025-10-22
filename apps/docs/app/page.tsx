import type { Route } from "next";
import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">Agents Documentation</h1>
      <p className="text-lg text-neutral-300">
        Explore the hybrid deterministic/AI email automation platform used for HubSpot cancellations with a
        Slack human-in-the-middle workflow. Use the sidebar to navigate through architecture, package
        responsibilities, policy guardrails, and operational runbooks.
      </p>
      <div className="flex gap-4">
        <Link
          href={"/docs" as Route}
          className="rounded-md bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
        >
          View Documentation
        </Link>
        <Link
          href={"/docs/hybrid-processing" as Route}
          className="rounded-md border border-white/20 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/40 hover:text-white"
        >
          Start with the processor flow
        </Link>
      </div>
    </main>
  );
}

