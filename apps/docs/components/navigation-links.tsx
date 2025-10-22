export interface NavLink {
  title: string;
  href: string;
}

export const primaryLinks: NavLink[] = [
  { title: "Overview", href: "/docs" },
  { title: "Hybrid Flow", href: "/docs/hybrid-processing" },
  { title: "Packages", href: "/docs/packages" },
  { title: "Policies", href: "/docs/policies" },
  { title: "Operations", href: "/docs/operations" }
];
