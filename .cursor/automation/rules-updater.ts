#!/usr/bin/env tsx
/**
 * Automated Cursor Rules Updater
 * 
 * This script monitors codebase changes and automatically updates
 * Cursor rules, memories, and configurations to stay in sync.
 * 
 * Triggered by:
 * - Git hooks (pre-commit, post-merge)
 * - File watchers (development mode)
 * - CI/CD pipeline (post-deploy)
 */

import { watch } from "fs";
import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

interface RuleUpdate {
  file: string;
  action: string;
  timestamp: Date;
  changes: string[];
}

class CursorRulesAutomation {
  private projectRoot: string;
  private updatesLog: RuleUpdate[] = [];

  constructor() {
    this.projectRoot = process.cwd();
  }

  /**
   * Main automation workflow
   */
  async run() {
    console.log("🤖 Cursor Rules Automation Started");
    
    // 1. Detect significant codebase changes
    const changes = await this.detectChanges();
    
    // 2. Update rules based on changes
    if (changes.schema) await this.updateDatabaseRules();
    if (changes.prompts) await this.updatePromptRules();
    if (changes.packages) await this.updateDependencyRules();
    if (changes.architecture) await this.updateArchitectureMemories();
    if ((changes as any).agentsRuntime) await this.updateAgentsSdkRules();
    if ((changes as any).hybridProcessor) await this.updateHybridProcessorRules();
    
    // 3. Validate all rules
    await this.validateRules();
    
    // 4. Update .cursormemory with latest context
    await this.updateMemories();
    
    // 5. Generate report
    this.generateReport();
    
    console.log("✅ Cursor Rules Automation Complete");
  }

  /**
   * Detect significant changes in codebase
   */
  private async detectChanges() {
    const changes = {
      schema: this.hasFileChanged("packages/db/src/schema.ts"),
      prompts: this.hasFileChanged("packages/prompts/src/templates.ts"),
      packages: this.hasFileChanged("package.json") || this.hasFileChanged("packages/*/package.json"),
      architecture: this.hasFileChanged("documentation/project/plan.md"),
      agentsRuntime: this.hasFileChanged("packages/agents-runtime/src/*.ts"),
      hybridProcessor: this.hasFileChanged("apps/agent/src/hybrid-processor.ts") || 
                      this.hasFileChanged("apps/agent/src/simplified-processor.ts") ||
                      this.hasFileChanged("apps/agent/src/metrics.ts")
    };

    console.log("📊 Detected changes:", changes);
    return changes;
  }

  /**
   * Check if file has changed (git diff)
   */
  private hasFileChanged(pattern: string): boolean {
    try {
      const diff = execSync(`git diff HEAD~1 HEAD -- ${pattern}`, { 
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "ignore"]
      });
      return diff.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Update database-related rules based on schema changes
   */
  private async updateDatabaseRules() {
    console.log("📝 Updating database rules...");
    
    const schemaPath = join(this.projectRoot, "packages/db/src/schema.ts");
    const schema = readFileSync(schemaPath, "utf-8");
    
    // Extract table names and columns
    const tables = this.extractTables(schema);
    
    // Update database-patterns.mdc
    const ruleFile = join(this.projectRoot, ".cursor/rules/database-patterns.mdc");
    let ruleContent = readFileSync(ruleFile, "utf-8");
    
    // Update table list in rule
    const tableList = tables.map(t => `- \`${t.name}\``).join("\n");
    ruleContent = this.updateSection(
      ruleContent,
      "## Current Tables",
      `## Current Tables\n\n${tableList}\n`
    );
    
    writeFileSync(ruleFile, ruleContent);
    
    this.updatesLog.push({
      file: ruleFile,
      action: "updated_database_rules",
      timestamp: new Date(),
      changes: [`Added ${tables.length} tables to rules`]
    });
  }

  /**
   * Update prompt engineering rules based on template changes
   */
  private async updatePromptRules() {
    console.log("📝 Updating prompt rules...");
    
    const templatesPath = join(this.projectRoot, "packages/prompts/src/templates.ts");
    const templates = readFileSync(templatesPath, "utf-8");
    
    // Extract schemas and functions
    const schemas = this.extractSchemas(templates);
    const functions = this.extractFunctions(templates);
    
    // Update prompt-engineering.mdc
    const ruleFile = join(
      this.projectRoot,
      "packages/prompts/.cursor/rules/prompt-engineering.mdc"
    );
    let ruleContent = readFileSync(ruleFile, "utf-8");
    
    // Update schema list
    const schemaList = schemas.map(s => `- \`${s}\``).join("\n");
    ruleContent = this.updateSection(
      ruleContent,
      "## Available Schemas",
      `## Available Schemas\n\n${schemaList}\n`
    );
    
    writeFileSync(ruleFile, ruleContent);
    
    this.updatesLog.push({
      file: ruleFile,
      action: "updated_prompt_rules",
      timestamp: new Date(),
      changes: [`Updated ${schemas.length} schemas`, `Updated ${functions.length} functions`]
    });
  }

  /**
   * Update dependency-related rules based on package.json changes
   */
  private async updateDependencyRules() {
    console.log("📝 Updating dependency rules...");
    
    const packagePath = join(this.projectRoot, "package.json");
    const packageJson = JSON.parse(readFileSync(packagePath, "utf-8"));
    
    // Extract key dependencies
    const deps = {
      openai: packageJson.dependencies?.openai || "Not installed",
      drizzle: packageJson.dependencies?.["drizzle-orm"] || "Not installed",
      slack: packageJson.dependencies?.["@slack/bolt"] || "Not installed"
    };
    
    // Update .cursormemory with dependency versions
    await this.updateMemorySection("## Dependencies", deps);
    
    this.updatesLog.push({
      file: ".cursormemory",
      action: "updated_dependencies",
      timestamp: new Date(),
      changes: Object.entries(deps).map(([k, v]) => `${k}: ${v}`)
    });
  }

  /**
   * Update architecture memories based on plan.md changes
   */
  private async updateArchitectureMemories() {
    console.log("📝 Updating architecture memories...");
    
    const planPath = join(this.projectRoot, "documentation/project/plan.md");
    if (!existsSync(planPath)) {
      // Check root for plan.md
      const rootPlanPath = join(this.projectRoot, "plan.md");
      if (existsSync(rootPlanPath)) {
        const plan = readFileSync(rootPlanPath, "utf-8");
        await this.extractAndUpdateArchitecture(plan);
      }
      return;
    }
    
    const plan = readFileSync(planPath, "utf-8");
    await this.extractAndUpdateArchitecture(plan);
  }

  /**
   * Update Agents SDK rule with available agents/tools
   */
  private async updateAgentsSdkRules() {
    console.log("📝 Updating Agents SDK rules...");

    const agentsPath = join(this.projectRoot, "packages/agents-runtime/src/agents.ts");
    const toolsPath = join(this.projectRoot, "packages/agents-runtime/src/tools.ts");

    const agentsSrc = existsSync(agentsPath) ? readFileSync(agentsPath, "utf-8") : "";
    const toolsSrc = existsSync(toolsPath) ? readFileSync(toolsPath, "utf-8") : "";

    const agentNames = Array.from(agentsSrc.matchAll(/export const (\w+)\s*=\s*Agent/g)).map(m => m[1]);
    const toolNames = Array.from(toolsSrc.matchAll(/export const (\w+)\s*=\s*tool\(/g)).map(m => m[1]);

    const ruleFile = join(this.projectRoot, ".cursor/rules/agents-sdk.mdc");
    if (!existsSync(ruleFile)) return;
    let ruleContent = readFileSync(ruleFile, "utf-8");

    const agentsList = agentNames.map(n => `- \`${n}\``).join("\n");
    const toolsList = toolNames.map(n => `- \`${n}\``).join("\n");

    ruleContent = this.updateSection(ruleContent, "## Available Agents", `## Available Agents\n\n${agentsList}\n`);
    ruleContent = this.updateSection(ruleContent, "## Available Tools", `## Available Tools\n\n${toolsList}\n`);

    writeFileSync(ruleFile, ruleContent);

    this.updatesLog.push({
      file: ruleFile,
      action: "updated_agents_sdk_rules",
      timestamp: new Date(),
      changes: [`Agents: ${agentNames.length}`, `Tools: ${toolNames.length}`]
    });
  }

  /**
   * Update hybrid processor rules when processors change
   */
  private async updateHybridProcessorRules() {
    console.log("📝 Updating hybrid processor rules...");

    const hybridPath = join(this.projectRoot, "apps/agent/src/hybrid-processor.ts");
    const simplifiedPath = join(this.projectRoot, "apps/agent/src/simplified-processor.ts");
    const metricsPath = join(this.projectRoot, "apps/agent/src/metrics.ts");

    const hybridSrc = existsSync(hybridPath) ? readFileSync(hybridPath, "utf-8") : "";
    const simplifiedSrc = existsSync(simplifiedPath) ? readFileSync(simplifiedPath, "utf-8") : "";
    const metricsSrc = existsSync(metricsPath) ? readFileSync(metricsPath, "utf-8") : "";

    // Extract function names and patterns
    const hybridFunctions = Array.from(hybridSrc.matchAll(/export (?:async )?function (\w+)/g)).map(m => m[1]);
    const simplifiedFunctions = Array.from(simplifiedSrc.matchAll(/export (?:async )?function (\w+)/g)).map(m => m[1]);
    const metricsFunctions = Array.from(metricsSrc.matchAll(/export (?:async )?function (\w+)/g)).map(m => m[1]);

    // Update hybrid architecture rule
    const ruleFile = join(this.projectRoot, ".cursor/rules/hybrid-architecture.mdc");
    if (existsSync(ruleFile)) {
      let ruleContent = readFileSync(ruleFile, "utf-8");
      
      const functionsList = [
        ...hybridFunctions.map(f => `- \`${f}\` (hybrid-processor.ts)`),
        ...simplifiedFunctions.map(f => `- \`${f}\` (simplified-processor.ts)`),
        ...metricsFunctions.map(f => `- \`${f}\` (metrics.ts)`)
      ].join("\n");

      ruleContent = this.updateSection(ruleContent, "## Available Functions", `## Available Functions\n\n${functionsList}\n`);
      
      writeFileSync(ruleFile, ruleContent);
    }

    // Update agent workflow rule
    const workflowRuleFile = join(this.projectRoot, "apps/agent/.cursor/rules/agent-workflow.mdc");
    if (existsSync(workflowRuleFile)) {
      let workflowContent = readFileSync(workflowRuleFile, "utf-8");
      
      // Update function references in examples
      const updatedContent = workflowContent
        .replace(/processEmailSimplified/g, hybridFunctions.includes('processEmailHybrid') ? 'processEmailHybrid' : 'processEmailSimplified')
        .replace(/extractEmailData/g, hybridFunctions.includes('extractEmailDataDeterministic') ? 'extractEmailDataDeterministic' : 'extractEmailData');
      
      writeFileSync(workflowRuleFile, updatedContent);
    }

    this.updatesLog.push({
      file: ruleFile,
      action: "updated_hybrid_processor_rules",
      timestamp: new Date(),
      changes: [
        `Hybrid functions: ${hybridFunctions.length}`,
        `Simplified functions: ${simplifiedFunctions.length}`,
        `Metrics functions: ${metricsFunctions.length}`
      ]
    });
  }

  /**
   * Extract architecture details and update memories
   */
  private async extractAndUpdateArchitecture(plan: string) {
    // Extract tech stack
    const techStackMatch = plan.match(/## Tech Stack[\s\S]*?(?=\n##|$)/);
    if (techStackMatch) {
      const techStack = techStackMatch[0]
        .split("\n")
        .filter(line => line.startsWith("- "))
        .map(line => line.trim())
        .join("\n");
      
      await this.updateMemorySection("## Tech Stack", { raw: techStack });
    }
    
    this.updatesLog.push({
      file: ".cursormemory",
      action: "updated_architecture",
      timestamp: new Date(),
      changes: ["Updated tech stack from plan.md"]
    });
  }

  /**
   * Validate all rule files for correctness
   */
  private async validateRules() {
    console.log("✅ Validating rules...");
    
    const rulesDir = join(this.projectRoot, ".cursor/rules");
    const rules = execSync(`find ${rulesDir} -name "*.mdc"`, { encoding: "utf-8" })
      .split("\n")
      .filter(Boolean);
    
    for (const rule of rules) {
      const content = readFileSync(rule, "utf-8");
      
      // Check for required frontmatter
      if (!content.startsWith("---")) {
        console.warn(`⚠️  Missing frontmatter in ${rule}`);
      }
      
      // Check for description
      if (!content.includes("description:")) {
        console.warn(`⚠️  Missing description in ${rule}`);
      }
    }
  }

  /**
   * Update .cursormemory file
   */
  private async updateMemories() {
    console.log("📝 Updating memories...");
    
    const memoryPath = join(this.projectRoot, ".cursormemory");
    let memory = readFileSync(memoryPath, "utf-8");
    
    // Update last updated timestamp
    const now = new Date().toISOString().split("T")[0];
    memory = memory.replace(
      /Last Updated: .*/,
      `Last Updated: ${now}`
    );
    
    // Add automation note
    if (!memory.includes("## Automation")) {
      memory += `\n\n## Automation\n\n- Rules auto-updated via \`.cursor/automation/rules-updater.ts\`\n- Last automation run: ${new Date().toISOString()}\n`;
    } else {
      memory = memory.replace(
        /Last automation run: .*/,
        `Last automation run: ${new Date().toISOString()}`
      );
    }
    
    writeFileSync(memoryPath, memory);
  }

  /**
   * Update a specific section in .cursormemory
   */
  private async updateMemorySection(section: string, data: any) {
    const memoryPath = join(this.projectRoot, ".cursormemory");
    let memory = readFileSync(memoryPath, "utf-8");
    
    const content = typeof data === "object" && data.raw 
      ? data.raw 
      : Object.entries(data).map(([k, v]) => `- ${k}: ${v}`).join("\n");
    
    // Check if section exists
    if (memory.includes(section)) {
      // Update existing section
      const sectionRegex = new RegExp(`${section}[\\s\\S]*?(?=\\n##|$)`);
      memory = memory.replace(sectionRegex, `${section}\n\n${content}\n`);
    } else {
      // Add new section
      memory += `\n${section}\n\n${content}\n`;
    }
    
    writeFileSync(memoryPath, memory);
  }

  /**
   * Generate automation report
   */
  private generateReport() {
    console.log("\n📊 Automation Report");
    console.log("=".repeat(50));
    
    if (this.updatesLog.length === 0) {
      console.log("No updates needed. All rules are current.");
      return;
    }
    
    this.updatesLog.forEach(update => {
      console.log(`\n📄 ${update.file}`);
      console.log(`   Action: ${update.action}`);
      console.log(`   Time: ${update.timestamp.toISOString()}`);
      console.log(`   Changes:`);
      update.changes.forEach(change => {
        console.log(`   - ${change}`);
      });
    });
    
    // Write report to file
    const reportPath = join(this.projectRoot, ".cursor/automation/last-run.json");
    writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      updates: this.updatesLog
    }, null, 2));
  }

  /**
   * Helper: Extract table definitions from schema
   */
  private extractTables(schema: string): Array<{ name: string; columns: string[] }> {
    const tables: Array<{ name: string; columns: string[] }> = [];
    const tableRegex = /export const (\w+) = pgTable/g;
    let match;
    
    while ((match = tableRegex.exec(schema)) !== null) {
      tables.push({ name: match[1], columns: [] });
    }
    
    return tables;
  }

  /**
   * Helper: Extract Zod schemas from templates
   */
  private extractSchemas(templates: string): string[] {
    const schemas: string[] = [];
    const schemaRegex = /export const (\w+Schema) = z\./g;
    let match;
    
    while ((match = schemaRegex.exec(templates)) !== null) {
      schemas.push(match[1]);
    }
    
    return schemas;
  }

  /**
   * Helper: Extract function names
   */
  private extractFunctions(templates: string): string[] {
    const functions: string[] = [];
    const funcRegex = /export (?:async )?function (\w+)/g;
    let match;
    
    while ((match = funcRegex.exec(templates)) !== null) {
      functions.push(match[1]);
    }
    
    return functions;
  }

  /**
   * Helper: Update a section in a rule file
   */
  private updateSection(content: string, sectionHeader: string, newSection: string): string {
    const sectionRegex = new RegExp(`${sectionHeader}[\\s\\S]*?(?=\\n##|$)`);
    
    if (content.includes(sectionHeader)) {
      return content.replace(sectionRegex, newSection);
    } else {
      return content + `\n${newSection}`;
    }
  }
}

// Run automation
if (import.meta.url === `file://${process.argv[1]}`) {
  const automation = new CursorRulesAutomation();
  automation.run().catch(error => {
    console.error("❌ Automation failed:", error);
    process.exit(1);
  });
}

export { CursorRulesAutomation };

