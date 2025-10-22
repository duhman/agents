import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocsBody, DocsPage } from "fumadocs-ui/page";
import { getPage } from "../../../lib/page-tree";

interface PageParams {
  slug?: string[];
}

interface PageProps {
  params?: Promise<PageParams>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = (await params) ?? {};
  const page = getPage(slug);

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

export default async function Page({ params }: PageProps) {
  const { slug } = (await params) ?? {};
  const page = getPage(slug);

  if (!page) {
    notFound();
  }

  const { body: MDXContent, toc, lastModified, description } = page.data;

  return (
    <DocsPage toc={toc} lastUpdate={lastModified ? new Date(lastModified) : undefined}>
      <h1>{page.data.title}</h1>
      {description ? <p>{description}</p> : null}
      <DocsBody>
        <MDXContent />
      </DocsBody>
    </DocsPage>
  );
}
