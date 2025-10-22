import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import { z } from "zod";

const frontmatterSchema = z.object({
  title: z.string(),
  description: z.string().optional().nullable(),
  order: z.number().optional().nullable()
});

export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    schema: frontmatterSchema
  }
});

export default defineConfig();

