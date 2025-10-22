import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocsBody, DocsPage, DocsTitle } from "fumadocs-ui/page";
import { getPage, pageTree } from "../../../lib/page-tree";

interface PageProps {
  params: {
    slug?: string[];
  };
}

export function generateMetadata({ params }: PageProps): Metadata {
  const page = getPage(params.slug);

  if (!page) {
    return {
      title: "Not found"
    };
  }

  return {
    title: `${page.data.title} | Agents Documentation`,
    description: page.data.description
  };
}

export default function Page({ params }: PageProps) {
  const page = getPage(params.slug);

  if (!page) {
    notFound();
  }

  return (
    <DocsPage toc={page.data.toc} meta={page.data.meta} lastModified={page.data.lastModified} tree={pageTree}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsBody>{page.data.body}</DocsBody>
    </DocsPage>
  );
}


