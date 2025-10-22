import type { BaseLayoutProps } from "fumadocs-ui/layout";

export function baseOptions(): Omit<BaseLayoutProps, "children"> {
  return {
    nav: {
      title: "Agents Docs",
      url: "/docs"
    },
    links: [
      {
        text: "GitHub",
        url: "https://github.com/"
      }
    ]
  } satisfies Omit<BaseLayoutProps, "children">;
}
