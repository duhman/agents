/* Dev/preview-only visual snapshot helper; safe no-op if Puppeteer not present */
async function run() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const puppeteer = require("puppeteer");
    const baseUrl = process.env.PREVIEW_URL || "http://localhost:3000";
    const flag = process.env.UI_EXPERIMENTAL_OPERATOR === "true";
    if (!flag) {
      console.log("UI flag off; skipping screenshot.");
      process.exit(0);
    }
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/operator`, { waitUntil: "networkidle2", timeout: 60000 });
    await page.waitForTimeout(2000);
    const canvas = await page.$("div.h-[600px]");
    if (!canvas) {
      console.log("Canvas not found; skipping.");
      await browser.close();
      process.exit(0);
    }
    await canvas.screenshot({ path: "/tmp/operator-canvas.png" });
    console.log("Saved screenshot to /tmp/operator-canvas.png");
    await browser.close();
  } catch (e) {
    console.log("Skipping screenshot (puppeteer not installed or runtime not available).", String(e?.message || e));
    process.exit(0);
  }
}
run();
