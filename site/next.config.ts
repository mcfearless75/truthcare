import type { NextConfig } from "next";

// Defaults to "" so the production build (Vercel, domain root) is completely
// unaffected. Set to "/truthcare" only for the GitHub Pages preview build —
// see .github/workflows/deploy-pages.yml — which serves this site from a
// subpath rather than the domain root it actually lives at.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: false,
  images: { unoptimized: true }, // images pre-processed by scripts/process-images.mjs
  basePath,
  assetPrefix: basePath,
};

export default nextConfig;
