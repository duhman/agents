// Minimal JS cron handler to avoid TS/types
import { execSync } from "child_process";

export const config = { runtime: "nodejs", regions: ["iad1"] };

export default async function handler(req, res) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    console.log("Running training data export...");

    // Run export script
    execSync("tsx ops/scripts/export-jsonl.ts", { stdio: "inherit" });

    console.log("✓ Export completed");

    return res.status(200).json({
      success: true,
      message: "Training data exported successfully"
    });
  } catch (error) {
    console.error("Cron error:", error?.message || String(error));
    return res.status(500).json({ error: error?.message || "unknown_error" });
  }
}
