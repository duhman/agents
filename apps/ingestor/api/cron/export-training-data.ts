/**
 * Vercel Cron: monthly export of training data (runs on 1st of each month)
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { execSync } from "child_process";

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
  } catch (error: any) {
    console.error("Cron error:", error);
    return res.status(500).json({ error: error.message });
  }
}

