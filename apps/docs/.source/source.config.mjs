// source.config.ts
import { defineConfig, defineDocs } from "fumadocs-mdx/config/zod-3";
import { z } from "zod";
var frontmatterSchema = z.object({
  title: z.string(),
  description: z.string().optional().nullable(),
  order: z.number().optional().nullable()
});
var docs = defineDocs({
  dir: "content/docs",
  schema: frontmatterSchema
});
var source_config_default = defineConfig({
  disableWarnings: process.env.NODE_ENV === "production"
});
export {
  source_config_default as default,
  docs
};
