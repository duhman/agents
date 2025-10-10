export async function maybeEnableDevtools() {
  const enabled = process.env.DEVTOOLS_ENABLED === "true";
  const isProd = process.env.NODE_ENV === "production";
  if (!enabled || isProd) return;
  try {
    const mod = await import("@ai-sdk-tools/devtools");
    if (typeof (mod as any).install === "function") {
      (mod as any).install();
    }
  } catch {
  }
}
