import { z } from "zod";

const flagsSchema = z.object({
  UI_EXPERIMENTAL_OPERATOR: z.enum(["true", "false"]).default("false"),
  DEVTOOLS_ENABLED: z.enum(["true", "false"]).default("false"),
  CACHE_VECTOR_SEARCH: z.enum(["true", "false"]).default("false")
});

export type Flags = z.infer<typeof flagsSchema>;

export function getFlags(): Flags {
  return flagsSchema.parse({
    UI_EXPERIMENTAL_OPERATOR: process.env.UI_EXPERIMENTAL_OPERATOR ?? "false",
    DEVTOOLS_ENABLED: process.env.DEVTOOLS_ENABLED ?? "false",
    CACHE_VECTOR_SEARCH: process.env.CACHE_VECTOR_SEARCH ?? "false"
  });
}
