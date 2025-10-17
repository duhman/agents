import { execSync } from "child_process";
export const config = { runtime: "nodejs", regions: ["iad1"] };
const parseErrorMessage = (error) => error instanceof Error ? error.message : String(error);
export default async function handler(req, res) {
    // Verify cron secret to prevent unauthorized access
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    try {
        console.log("Running training data export...");
        // Run export script
        execSync("tsx ops/scripts/export-jsonl.ts", { stdio: "inherit" });
        console.log("✓ Export completed");
        res.status(200).json({
            success: true,
            message: "Training data exported successfully"
        });
    }
    catch (error) {
        const message = parseErrorMessage(error);
        console.error("Cron error:", message);
        res.status(500).json({ error: message || "unknown_error" });
    }
}
