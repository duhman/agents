#!/usr/bin/env node

const enabled = String(process.env.DEVTOOLS_ENABLED || "").toLowerCase() === "true";
const env = String(process.env.NODE_ENV || "");
const ci = String(process.env.CI || "");

if (ci && enabled && (env === "production" || env === "preview" || process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview")) {
  console.error("DEVTOOLS_ENABLED=true is not allowed in CI for production/preview environments.");
  process.exit(1);
}

console.log("Devtools guard passed.");
