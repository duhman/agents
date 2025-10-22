"use client";

import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-100">
          <div className="max-w-lg space-y-4 p-8 text-center">
            <h1 className="text-2xl font-semibold">Something went wrong</h1>
            <p className="text-neutral-300">
              An unexpected error occurred while rendering the documentation. Please refresh the
              page or contact the platform team if the issue persists.
            </p>
            {error.digest ? (
              <code className="block rounded bg-neutral-900 p-3 text-sm text-neutral-400">
                Error digest: {error.digest}
              </code>
            ) : null}
          </div>
        </div>
      </body>
    </html>
  );
}
