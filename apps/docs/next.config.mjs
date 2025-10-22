import { createMDX } from "fumadocs-mdx/next";

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  typedRoutes: true
};

const withMDX = createMDX({
  // Customize the path when needed; defaults are good for now
  // configPath: "./source.config.ts"
});

export default withMDX(config);


