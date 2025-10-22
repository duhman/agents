import type { ReactNode } from "react";
import { DocsLayout } from "fumadocs-ui/layout";
import { baseOptions } from "../../lib/layout-options";
import { pageTree } from "../../lib/page-tree";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout tree={pageTree} {...baseOptions()}>
      {children}
    </DocsLayout>
  );
}
