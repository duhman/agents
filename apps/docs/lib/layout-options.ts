import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: "Agents Docs",
      url: "/docs"
    },
    footer: {
      text: "Agents Monorepo – Hybrid deterministic/AI processing",
      links: [
        {
          text: "GitHub",
          url: "https://github.com/"
        }
      ]
    }
  } satisfies BaseLayoutProps;
}


